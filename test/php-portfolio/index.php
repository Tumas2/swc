<!DOCTYPE html>
<html lang="en">
<?php
$base_url = '/swc/swc/test/php-portfolio';
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

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

    <!-- Preload above fold components -->
    <!-- <link rel="modulepreload" href="./components/header/component.js" /> -->

    <link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100..900&display=swap" rel="stylesheet">

    <script type="module" src="./components/index.js"></script>
    <link rel="stylesheet" href="./output.css?ver=<?php echo time(); ?>">
</head>

<body>
    <?php
    // echo "{$_SERVER['HTTP_HOST']} {$_SERVER['PHP_SELF']}";
    // print('<pre>');
    // print_r($_SERVER);
    // print('</pre>');

    $title = ' PHP 8.5 Released boop';

    $slug = $title
        |> trim(...)
        |> (fn($str) => str_replace(' ', '-', $str))
        |> (fn($str) => str_replace('.', '', $str))
        |> strtolower(...);

    echo '<div style="color:black">'.$slug.'</div>';
    ?>
    <router-container base-path="<?php echo $base_url; ?>">
        <main-header></main-header>

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
