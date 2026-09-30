<?php

declare(strict_types=1);

use SWC\NanoRenderer;

/**
 * Parity cases: [template, data as JSON]. Each is rendered by the JS
 * NanoRenderer and by the PHP one (with data decoded both as arrays and as
 * objects); all three outputs must be identical.
 */
$parity_cases = [
    'booleans'              => ['{{a}}|{{b}}', '{"a":true,"b":false}'],
    'empty array is truthy' => ['{{#if l}}y{{else}}n{{/if}}', '{"l":[]}'],
    '"0" is truthy'         => ['{{#if s}}y{{else}}n{{/if}}', '{"s":"0"}'],
    '0 is falsy'            => ['{{#if z}}y{{else}}n{{/if}}', '{"z":0}'],
    'zeros print'           => ['{{z}}|{{s}}', '{"z":0,"s":"0"}'],
    'each skips objects'    => ['{{#each o}}{{this}}{{else}}empty{{/each}}', '{"o":{"x":1}}'],
    'each with index'       => ['{{#each items}}{{index}}:{{name}},{{/each}}', '{"items":[{"name":"a"},{"name":"b"}]}'],
    'each primitives'       => ['{{#each list}}[{{this}}]{{/each}}', '{"list":[1,"two",null,true,false]}'],
    'nested each'           => ['{{#each rows}}[{{#each cells}}{{this}}{{index}}{{/each}}]{{/each}}', '{"rows":[{"cells":[1,2]},{"cells":[3]}]}'],
    'this.prop'             => ['{{#each people}}{{this.name}};{{/each}}', '{"people":[{"name":"Ann"},{"name":"Bo"}]}'],
    'outer lookup in each'  => ['{{#each items}}{{title}}{{this}}{{/each}}', '{"title":"T","items":[1,2]}'],
    'length'                => ['{{x.length}}|{{s.length}}|{{e.length}}', '{"x":[1,2,3],"s":"héllo😀","e":""}'],
    'if on length'          => ['{{#if x.length}}some{{else}}none{{/if}}', '{"x":[]}'],
    'list index'            => ['{{a.0}}{{a.1}}', '{"a":["x","y"]}'],
    'numbers'               => ['{{a}}|{{b}}|{{c}}|{{d}}|{{e}}|{{f}}|{{g}}|{{h}}', '{"a":0.30000000000000004,"b":1e-7,"c":1e21,"d":2.5,"e":-0.000001,"f":1e20,"g":2.0,"h":123456.789}'],
    'arrays and objects'    => ['{{arr}}|{{obj}}|{{{arr}}}', '{"arr":[1,[2,3],null],"obj":{"a":1}}'],
    'top-level this'        => ['{{this}}', '{"a":1}'],
    'escaping'              => ['{{s}}', '{"s":"<a href=\'/x\'>&\"</a>"}'],
    'fallbacks'             => ['{{missing || "dflt"}}|{{{nothing || \'raw\'}}}|{{n || "x"}}', '{"n":null}'],
    'raw'                   => ['{{{html}}}', '{"html":"<b>x</b>"}'],
    'deep missing'          => ['{{#if o.a.b}}y{{else}}n{{/if}}{{o.a.b}}', '{"o":{}}'],
    'whitespace in tags'    => ['{{  name  }}|{{#if   a }}y{{/if}}', '{"name":"N","a":1}'],
    'null this'             => ['{{#each l}}[{{this}}]{{/each}}', '{"l":[null]}'],
    'each else on missing'  => ['{{#each nope}}x{{else}}none{{/each}}', '{}'],
    'unclosed block'        => ['{{#if a}}x', '{"a":1}'],
    'stray close'           => ['x{{/if}}y', '{}'],
    'mismatched close'      => ['{{#if a}}x{{/each}}', '{"a":1}'],
    'else at top level'     => ['x{{else}}y', '{}'],
    'unicode'               => ['{{s}}', '{"s":"åäö ☃"}'],
];

Test::section('NanoRenderer — parity with NanoRenderer.js');

$js_output = null;
$node      = proc_open(
    ['node', __DIR__ . '/js-render.mjs'],
    [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
    $pipes
);

if (is_resource($node)) {
    fwrite($pipes[0], json_encode(array_values($parity_cases)));
    fclose($pipes[0]);
    $stdout = stream_get_contents($pipes[1]);
    $stderr = stream_get_contents($pipes[2]);
    proc_close($node);
    $js_output = json_decode($stdout, true);
    if (!is_array($js_output)) {
        Test::ok('node renders the parity cases', false, trim($stderr));
    }
}

if (!is_array($js_output)) {
    echo "  skip  node not available — parity cases not run\n";
} else {
    $renderer = new NanoRenderer();
    foreach (array_keys($parity_cases) as $i => $name) {
        [$template, $json] = $parity_cases[$name];
        [$as_array]  = Test::warnings(fn() => $renderer->render($template, json_decode($json, true)));
        [$as_object] = Test::warnings(fn() => $renderer->render($template, json_decode($json)));
        Test::same($name, $js_output[$i], $as_array);
        Test::same("{$name} (object data)", $js_output[$i], $as_object);
    }
}

Test::section('NanoRenderer — PHP only');

$renderer = new NanoRenderer();

[, $warnings] = Test::warnings(fn() => $renderer->render('{{#each php_only}}x', []));
Test::ok('malformed template warns', count($warnings) === 1 && str_contains($warnings[0], 'unclosed {{#each}}'), implode(' | ', $warnings));

[, $warnings] = Test::warnings(fn() => $renderer->render('{{#each php_only}}x', []));
Test::same('malformed template warns only once (cached)', [], $warnings);

Test::same('{{{safe}}} sanitizes', '<b>x</b>', $renderer->render('{{{safe h}}}', ['h' => '<b onclick="x()">x</b><script>y()</script>']));
Test::same('{{{safe}}} of falsy value is empty', '', $renderer->render('{{{safe h}}}', ['h' => 0]));
Test::same('Stringable objects', 'str', $renderer->render('{{o}}', ['o' => new class implements Stringable {
    public function __toString(): string { return 'str'; }
}]));
