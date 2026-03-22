<!DOCTYPE html>
<html lang="en">
<?php
$base_url = '/swc/test/tums';
?>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tums Portfolio</title>
    <base href="<?php echo $base_url; ?>/">

    <script type="importmap">
        {
            "imports": {
                "swc": "./swc.js"
            }
        }
    </script>
    <link rel="stylesheet" href="./style.css">
    
    <!-- Component Imports -->
    <script type="module" src="./components/layout/header/component.js"></script>
    <script type="module" src="./components/pages/home/component.js"></script>
    <script type="module" src="./components/pages/blog/component.js"></script>
    <script type="module" src="./components/pages/post/component.js"></script>
    <script type="module" src="./components/layout/footer/component.js"></script>
</head>
<body>
    <router-container base-path="<?php echo $base_url; ?>">
        <main-header></main-header>

        <main class="container" style="padding-top: 2rem;">
            <router-switch>
                <!-- Home Page -->
                <router-route path="/" src="./components/pages/home/index.html">
                    <?php 
                    // Normalize URIs for comparison (remove trailing slashes)
                    $clean_uri = rtrim($_SERVER['REQUEST_URI'], '/');
                    $clean_base = rtrim($base_url, '/');
                    
                    if ($clean_uri === $clean_base || $clean_uri === "") { 
                        echo file_get_contents(__DIR__ . '/components/pages/home/index.html');
                    } 
                    ?>
                </router-route>

                <!-- Blog Index -->
                <router-route path="/blog/" src="./components/pages/blog/index.html">
                    <?php 
                    // Match /blog or /blog/
                    if ($clean_uri === "{$clean_base}/blog") {
                        $html = file_get_contents(__DIR__ . '/components/pages/blog/index.html');
                        
                        $api_url = 'https://api.tums.se/wp-json/wp/v2/posts?_fields=id,title,excerpt,slug,date';
                        $sslOptions = [
                            "ssl" => [
                                "verify_peer" => false, 
                                "verify_peer_name" => false,
                            ],
                        ];
                        $posts = @file_get_contents($api_url, false, stream_context_create($sslOptions));
                        
                        if ($posts) {
                            $script = "<script type='application/json' id='server-data-blog'>{$posts}</script>";
                            $html = str_replace('</blog-page>', $script . '</blog-page>', $html);
                        }
                        echo $html;
                    } 
                    ?>
                </router-route>

                <!-- Single Post -->
                <router-route path="/blog/:slug" src="./components/pages/post/index.html">
                    <post-page>
                        <!-- <template shadowrootmode="open"> -->
                        <?php 
                        // Check if URI starts with /blog/
                        if (strpos($_SERVER['REQUEST_URI'], "{$base_url}/blog/") === 0) {
                            $path_parts = explode('/', parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
                            // Remove empty elements from end if trailing slash exists
                            $path_parts = array_filter($path_parts);
                            $slug = end($path_parts);
                            
                            // Ensure we aren't matching 'blog' itself
                            if ($slug && $slug !== 'blog') {
                                $html = file_get_contents(__DIR__ . '/components/pages/post/markup.html');

                                $api_url = "https://api.tums.se/wp-json/wp/v2/posts?slug={$slug}&_fields=id,title,content,date";
                                $sslOptions = [
                                    "ssl" => [
                                        "verify_peer" => false, 
                                        "verify_peer_name" => false,
                                    ],
                                ];
                                $posts = @file_get_contents($api_url, false, stream_context_create($sslOptions));
                                
                                if ($posts) {
                                    $data = json_decode($posts, true);
                                    if (!empty($data)) {
                                        $post = json_encode($data[0]);
                                        $script = "<script type='application/json' id='server-data-post'>{$post}</script>";
                                        $html = str_replace('</post-page>', $script . '</post-page>', $html);
                                    }
                                }
                                echo $html;
                            }
                        } 
                        ?>
                        <!-- </template> -->
                    </post-page>
                </router-route>

                <!-- 404 -->
                <router-route path="/*">
                    <h1>404 - Not Found</h1>
                </router-route>
            </router-switch>
        </main>
        <main-footer></main-footer>
    </router-container>
</body>
</html>
