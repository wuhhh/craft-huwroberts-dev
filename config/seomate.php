<?php

use craft\helpers\App;

return [
	'cacheEnabled' => (bool) !App::env('DEV_MODE'),
	'siteName' => '{{ seo.siteName }}',
	'sitenamePosition' => 'before',

    'defaultMeta' => [
        'title' => ['seo.seoTitle'],
        'description' => ['seo.seoDescription'],
		'keywords' => ['seo.seoKeywords'],
        'image' => ['seo.seoImage'],
		'og:title' => ['seo.seoTitle'],
		'og:image' => ['seo.seoImage'],
		'twitter:image' => ['seo.seoTwitterImage'],
    ],

	'additionalMeta' => [
        'og:type' => 'website',
        'twitter:card' => 'summary_large_image',

        'og:see_also' => function ($context) {
            $seeAlsoLinks = [];
            $seeAlso = $context['seo']->seeAlso;

            if (!empty($seeAlso)) {
                foreach ($seeAlso as $also) {
                    $seeAlsoLinks[] = $also['url'];
                }
            }

            return $seeAlsoLinks;
        },
    ],
];
