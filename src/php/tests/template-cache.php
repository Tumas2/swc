<?php

declare(strict_types=1);

use SWC\NanoRenderer;

Test::section('NanoRenderer — compiled-template cache');

$cache_dir = sys_get_temp_dir() . '/swc-nano-cache-test-' . getmypid();

/**
 * Renders a template in a fresh PHP process with the cache on, so nothing
 * comes from this process's in-memory cache.
 *
 * @param string $cache_dir
 * @param string $template
 * @param array  $data
 * @return string
 */
function render_in_new_process(string $cache_dir, string $template, array $data): string
{
    $code = sprintf(
        'require %s; SWC\NanoRenderer::set_cache_dir(%s); echo (new SWC\NanoRenderer())->render(%s, json_decode(%s, true));',
        var_export(__DIR__ . '/../swc.php', true),
        var_export($cache_dir, true),
        var_export($template, true),
        var_export(json_encode($data), true)
    );

    // An argument array runs PHP directly, with no shell quoting involved.
    $process = proc_open([PHP_BINARY, '-r', $code], [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
    $output  = stream_get_contents($pipes[1]) . stream_get_contents($pipes[2]);
    proc_close($process);
    return $output;
}

NanoRenderer::set_cache_dir($cache_dir);
Test::ok('set_cache_dir creates the directory', is_dir($cache_dir));

// A template this process hasn't seen, so it is parsed and written now.
$id       = uniqid();
$template = 'cached {{x}} ' . $id;
Test::same('renders normally with the cache on', 'cached 1 ' . $id, (new NanoRenderer())->render($template, ['x' => 1]));

$files = glob($cache_dir . '/nano-*.php') ?: [];
Test::same('writes one compiled file', 1, count($files));
Test::ok('no temporary files left behind', (glob($cache_dir . '/*.tmp') ?: []) === []);

Test::same('a new process renders from the file', 'cached 2 ' . $id, render_in_new_process($cache_dir, $template, ['x' => 2]));

// Prove the file is what gets used: change it and render in a new process.
file_put_contents($files[0], "<?php return [['type' => 'text', 'value' => 'FROM CACHE']];\n");
Test::same('the cached file is used instead of parsing', 'FROM CACHE', render_in_new_process($cache_dir, $template, ['x' => 3]));

// A broken cache file falls back to parsing.
file_put_contents($files[0], "<?php return 'garbage';\n");
Test::same('a broken cache file falls back to parsing', 'cached 4 ' . $id, render_in_new_process($cache_dir, $template, ['x' => 4]));

[, $warnings] = Test::warnings(fn() => (new NanoRenderer())->render('{{#if broken ' . uniqid() . '}}', []));
Test::ok('malformed templates warn and are not written', count($warnings) === 1 && count(glob($cache_dir . '/nano-*.php') ?: []) === 1, var_export($warnings, true));

NanoRenderer::set_cache_dir(null);
(new NanoRenderer())->render('uncached ' . uniqid(), []);
Test::same('set_cache_dir(null) turns it off', 1, count(glob($cache_dir . '/nano-*.php') ?: []));

[, $warnings] = Test::warnings(fn() => NanoRenderer::set_cache_dir(__FILE__ . '/not-a-dir'));
Test::ok('an unusable directory warns and leaves the cache off', count($warnings) === 1 && str_contains($warnings[0], 'cache is off'), var_export($warnings, true));
NanoRenderer::set_cache_dir(null);

array_map('unlink', glob($cache_dir . '/*') ?: []);
rmdir($cache_dir);
