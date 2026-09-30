<?php

declare(strict_types=1);

use SWC\Markup;

Test::section('Markup — event attributes');

Test::same(
    'on* becomes data-swc-event-*',
    '<button data-swc-event-click="$inc" class="a">+</button>',
    Markup::convert_event_attributes('<button onclick="$inc" class="a">+</button>')
);
Test::same(
    'names are lowercased, quoting kept',
    "<input data-swc-event-input='\$change' data-swc-event-keydown=\$key>",
    Markup::convert_event_attributes("<input onInput='\$change' ONKEYDOWN=\$key>")
);
Test::same(
    'script, comments and templates are untouched',
    '<!-- <b onclick="x"> --><script>if (a<b) { el.onclick = 1 }</script><template><i onclick="t"></i></template><p data-swc-event-click="p"></p>',
    Markup::convert_event_attributes('<!-- <b onclick="x"> --><script>if (a<b) { el.onclick = 1 }</script><template><i onclick="t"></i></template><p onclick="p"></p>')
);
Test::same('markup without handlers is returned as-is', '<p class="on">x</p>', Markup::convert_event_attributes('<p class="on">x</p>'));

Test::section('Markup — slots');

Test::same(
    'named, default and fallback',
    '<h1><b slot="title">T</b></h1><div>text <i>body</i></div><footer>Default footer</footer>',
    Markup::fill_slots(
        '<h1><slot name="title">Untitled</slot></h1><div><slot></slot></div><footer><slot name="footer">Default footer</slot></footer>',
        '<b slot="title">T</b>text <i>body</i>'
    )
);
Test::same('whitespace-only light DOM shows fallback', '<p>fb</p>', Markup::fill_slots('<p><slot>fb</slot></p>', "\n  "));
Test::same('void elements in light DOM', '<p><img src="a.png">x</p>', Markup::fill_slots('<p><slot></slot></p>', '<img src="a.png">x'));

Test::section('Markup — attributes');

Test::same(
    'parse_attributes decodes and lowercases',
    ['slot' => 'a', 'title' => 'x > "y"', 'hidden' => '', 'data-n' => '5'],
    Markup::parse_attributes(' slot="a" TITLE="x &gt; &quot;y&quot;" hidden data-n=5 slot="ignored"')
);
