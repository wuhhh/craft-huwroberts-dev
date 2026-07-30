<?php

/**
 * twig-cs-fixer config for a Craft CMS project.
 *
 * Division of labour: Prettier (@zackad/prettier-plugin-twig, see .prettierrc.json)
 * owns everything about layout -- whitespace, indentation, quote style, hash
 * spacing, trailing commas, line breaks. This tool owns naming and correctness.
 *
 * That split is why the ruleset below is an explicit allowlist rather than a
 * standard with exclusions. Every bundled standard (Twig, Symfony, TwigCsFixer)
 * leads with spacing rules that contradict Prettier's output, so starting from
 * one means every save re-formats and the linter immediately objects. Building up
 * from an empty Ruleset also means a future twig-cs-fixer release cannot
 * introduce a new formatting rule into our set behind our back.
 *
 * Craft compatibility: no rule here implements NodeRuleInterface, so Twig's own
 * parser is never invoked (TwigCsFixer\Runner\Linter only parses when a node rule
 * is registered). That matters because Craft's tags -- {% cache %}, {% nav %},
 * {% switch %}, {% js %}, {% paginate %}, {% hook %} and the rest -- are unknown
 * to vanilla Twig and would fail to parse. The token-based rules used here read
 * twig-cs-fixer's own tag-agnostic token stream instead, so this file drops into
 * any Craft project unchanged, whatever tags its templates use.
 *
 * If a project does want the node rules (ValidConstantFunctionRule,
 * ForbiddenBlockRule, ForbiddenFilterRule, ForbiddenFunctionRule), they need
 * Craft's token parsers registered via Config::addTokenParser() first --
 * duplicating craft\web\twig\Extension::getTokenParsers(), which is a
 * Craft-version-coupled list. Not worth it unless the rules are actually wanted.
 */

declare(strict_types=1);

use TwigCsFixer\Config\Config;
use TwigCsFixer\File\Finder;
use TwigCsFixer\Rules\File\DirectoryNameRule;
use TwigCsFixer\Rules\File\FileNameRule;
use TwigCsFixer\Rules\Function\MacroArgumentNameRule;
use TwigCsFixer\Rules\Function\NamedArgumentNameRule;
use TwigCsFixer\Rules\Variable\VariableNameRule;
use TwigCsFixer\Ruleset\Ruleset;

$ruleset = new Ruleset();

// Craft templates and Twig variables are camelCase by convention, not the
// snake_case these rules default to. The '_' prefix is Craft's marker for a
// template that is not directly routable (_entry.twig, _layouts/, _includes/).
$ruleset
    ->addRule(new VariableNameRule(VariableNameRule::CAMEL_CASE))
    ->addRule(new MacroArgumentNameRule(MacroArgumentNameRule::CAMEL_CASE))
    ->addRule(new NamedArgumentNameRule(NamedArgumentNameRule::CAMEL_CASE))
    ->addRule(new FileNameRule(FileNameRule::CAMEL_CASE, 'templates', [], '_'))
    ->addRule(new DirectoryNameRule(DirectoryNameRule::CAMEL_CASE, 'templates', [], '_'));

// Deliberately absent: FileExtensionRule, which requires Symfony's
// name.html.twig double extension. Craft resolves plain .twig, so it fails every
// template in the project.

// allowNonFixableRules() is required, not optional: a name cannot be rewritten
// safely, so every rule above extends AbstractRule rather than
// AbstractFixableRule. Config defaults allowNonFixableRules to false and
// ConfigResolver pushes that onto the Ruleset, which would filter out all five
// and leave this file a silent no-op that reports a clean run.
//
// __DIR__ rather than a relative path: the Finder directory is validated on
// every run, including runs that pass an explicit file argument, so a relative
// path makes the whole config fail with 'The "templates" directory does not
// exist.' whenever the process is started from anywhere but the project root.
// The editor lints single files from whatever cwd it happens to have, so that
// has to keep working.
return (new Config('Craft'))
    ->allowNonFixableRules()
    ->setRuleset($ruleset)
    ->setFinder((new Finder())->in(__DIR__ . '/templates'));
