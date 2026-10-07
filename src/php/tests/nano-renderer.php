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

    // Comments
    'short comment'         => ['a{{! note }}b', '{}'],
    'long comment'          => ['a{{!-- has }} and {{x}} inside --}}b', '{"x":1}'],
    'comment in block'      => ['{{#if a}}{{!-- c --}}y{{/if}}', '{"a":1}'],
    'unclosed long comment' => ['a{{!-- open }}b', '{}'],

    // {{#unless}}
    'unless falsy'          => ['{{#unless a}}y{{else}}n{{/unless}}', '{"a":0}'],
    'unless truthy'         => ['{{#unless a}}y{{else}}n{{/unless}}', '{"a":"0"}'],
    'unless empty list'     => ['{{#unless l}}none{{/unless}}|{{#unless l.length}}empty{{/unless}}', '{"l":[]}'],
    'unless nested in each' => ['{{#each l}}{{#unless @last}}{{this}},{{else}}{{this}}{{/unless}}{{/each}}', '{"l":["a","b","c"]}'],
    'unless closed by /if'  => ['{{#unless a}}x{{/if}}', '{}'],
    'if closed by /unless'  => ['{{#if a}}x{{/unless}}', '{"a":1}'],
    'double else'           => ['{{#if a}}x{{else}}y{{else}}z{{/if}}', '{"a":1}'],
    'stray /unless'         => ['x{{/unless}}', '{}'],

    // Loop variables
    'loop @ variables'      => ['{{#each l}}{{@index}}{{#if @first}}F{{/if}}{{#if @last}}L{{/if}};{{/each}}', '{"l":["a","b","c"]}'],
    'single item first+last'=> ['{{#each l}}{{@first}}/{{@last}}{{/each}}', '{"l":[1]}'],
    'empty list @ vars'     => ['{{#each l}}{{@index}}{{else}}none{{/each}}', '{"l":[]}'],
    'nested @index'         => ['{{#each rows}}{{#each cells}}{{@index}}{{/each}}|{{@index}};{{/each}}', '{"rows":[{"cells":[1,2]},{"cells":[3]}]}'],
    'index and @index'      => ['{{#each l}}{{index}}={{@index}} {{/each}}', '{"l":["a","b"]}'],
    '@ vars outside loop'   => ['[{{@index}}{{@first}}]', '{}'],
    'item keys stay'        => ['{{#each l}}{{name}}{{index}}{{/each}}', '{"l":[{"name":"n","index":"own"}]}'],

    // Helpers (test helpers are registered identically in js-render.mjs)
    'helper string literals'  => ['{{upper "a b"}}|{{upper \'c d\'}}', '{}'],
    'helper path argument'    => ['{{upper name}}', '{"name":"ann"}'],
    'helper mixed arguments'  => ['{{join a "b c" 3 -1}}', '{"a":"x"}'],
    'helper argument count'   => ['{{count "a b" \'c\' d 4}}', '{}'],
    'helper literals'         => ['{{echo true}}|{{echo false}}|{{echo null}}|{{echo 1.50}}|{{echo 007}}|{{echo -0}}', '{}'],
    'helper returns list/obj' => ['{{echo l}}|{{echo o}}', '{"l":[1,2],"o":{"a":1}}'],
    'helper escaped vs raw'   => ['{{echo h}}|{{{echo h}}}', '{"h":"<b>&</b>"}'],
    'helper missing path'     => ['[{{echo nope}}]', '{}'],
    'helper in loop'          => ['{{#each l}}{{upper this}}{{echo @index}};{{/each}}', '{"l":["a","b"]}'],
    'unknown helper'          => ['[{{nope x}}]', '{}'],
    'throwing helper'         => ['[{{boom x}}]', '{}'],
    'no arguments is data'    => ['{{url}}|{{echo}}', '{"url":"javascript:x","echo":"E"}'],
    'fallback beats helper'   => ['{{echo x || "d"}}', '{}'],
    'non-name stays lookup'   => ['{{a.b c}}', '{"a":{"b c":"k"}}'],

    // Built-in url helper
    'url safe'                => ['{{#each u}}{{url this}}|{{/each}}', '{"u":["https://x.y/a?b=1&c=2","http://x","mailto:a@b.c","tel:+461","/rel/path","rel/path","//host/x","#frag","?q=1","","/foo:bar","  https://x"]}'],
    'url hostile'             => ['{{#each u}}{{url this}}|{{/each}}', '{"u":["javascript:alert(1)","JaVaScRiPt:alert(1)"," javascript:x","java\tscript:x","java\nscript:x","java\r\nscript:x","\u0001javascript:x","javascript\u0000:x","vbscript:x","data:text/html,x","ftp://x","file:///etc","c:\\\\path"]}'],
    'url non-strings'         => ['[{{url missing}}][{{url 5}}][{{url true}}]', '{}'],
    'url in attribute'        => ['<a href="{{url link}}">{{text}}</a>', '{"link":"javascript:alert(1)","text":"x"}'],
    'url same name as data'   => ['{{#if url}}<img src="{{url url}}">{{/if}}', '{"url":"/img/a.png"}'],
];

// Test helpers — registered identically in js-render.mjs.
NanoRenderer::register_helper('echo', fn(mixed $value = null): mixed => $value);
NanoRenderer::register_helper('upper', fn(mixed $value = null): string => strtoupper((string) $value));
NanoRenderer::register_helper('join', fn(mixed ...$args): string => implode('-', array_map(fn($a) => (string) $a, $args)));
NanoRenderer::register_helper('count', fn(mixed ...$args): int => count($args));
NanoRenderer::register_helper('boom', fn(): never => throw new RuntimeException('boom'));

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
