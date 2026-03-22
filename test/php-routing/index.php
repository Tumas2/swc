<!DOCTYPE html>
<html lang="en">
<?php
$base_url = '/swc/test/php-routing'; //'/swc/test/php-routing'
?>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <base href="<?php echo $base_url; ?>/">

    <script type="importmap">
        {
            "imports": {
                "swc": "./swc.js",
                "stores/": "./stores/"
            }
        }
    </script>

    <!-- <link rel="modulepreload" href="./test/components/index.js" /> -->
    <script type="module" src="<?php echo $base_url; ?>/components/index.js"></script>
    <link rel="stylesheet" href="<?php echo $base_url; ?>/styles.css?ver=<?php echo time(); ?>">
</head>

<body>
    <?php
    // echo "{$_SERVER['HTTP_HOST']} {$_SERVER['PHP_SELF']}";
    // print('<pre>');
    // print_r($_SERVER);
    // print('</pre>');
    ?>
    <router-container base-path="<?php echo $base_url; ?>">
        <header class="navigation">
            <nav>
                <router-link to="/">Home</router-link>
                <router-link to="/about">About</router-link>
                <router-link to="/users">Users</router-link>
                <router-link to="/thing">Thing</router-link>
            </nav>
        </header>

        <main>
            <router-switch>

                <router-route path="/" src="./pages/home-page.html">
                    <?php if ($_SERVER['REQUEST_URI'] === "{$base_url}/") {
                        echo file_get_contents(__DIR__ . '/pages/home-page.html');
                    } ?>
                </router-route>

                <router-route path="/about" src="./pages/about-page.html" no-cache>
                    <?php if ($_SERVER['REQUEST_URI'] === "{$base_url}/about") {
                        echo file_get_contents(__DIR__ . '/pages/about-page.html');
                    } ?>
                </router-route>

                <router-route path="/users/*" src="./pages/users-page.html">
                    <?php if ($_SERVER['REQUEST_URI'] === "{$base_url}/users") {
                        echo file_get_contents(__DIR__ . '/pages/users-page.html');
                    } ?>
                </router-route>

                <router-route path="/*" src="./pages/404.html"></router-route>
            </router-switch>
        </main>
    </router-container>
</body>

</html>
