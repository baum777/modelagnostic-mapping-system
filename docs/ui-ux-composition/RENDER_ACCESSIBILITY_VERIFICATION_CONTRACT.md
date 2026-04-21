# Render And Accessibility Verification Contract (v1)

Class: derived.
Use rule: applies to deterministic rendered-evidence verification surfaces under `scripts/tools`; this does not assert full legal accessibility certification.

## Objective

Add a deterministic verification layer that checks whether semantic-design outputs are materially reflected in rendered behavior and bounded accessibility evidence.

## Operating Modes

- `certification`
  - local fixtures only
  - deterministic and blocking
  - integrated into `npm run eval`
- `operator-evidence`
  - external URLs allowed
  - advisory and non-blocking
  - volatile evidence only

## Scope

- render/layout evidence capture via DOM/computed/layout metrics
- accessibility scanner evidence via Axe and Lighthouse
- structural WCAG-style lint checks for landmarks, headings, labels, names, and alt text
- machine-checkable contract-to-render assertion checks

## Non-Goals

- full visual regression platform
- pixel-perfect screenshot equality as a blocking gate
- full legal or complete WCAG certification
- parallel browser testing framework
- blocking external URL audits
- framework-specific hard-coding in shared-core surfaces
- aesthetic commentary as a substitute for rendered evidence checks

## Definition Of Done

### Wave 1

- local fixture pages render reproducibly at defined breakpoints
- `render-page-snapshots`, `run-axe-accessibility-audit`, and `run-lighthouse-page-audit` emit normalized JSON packets
- `render-layout` and `wcag-a11y` fixture kinds are wired into the existing eval runner as blocking local-fixture checks
- fixture sets include at least one clean pass, known fail, and borderline case per major class
- screenshots remain artifacts; DOM/computed/layout metrics are primary blocking signals

### Wave 2

- semantic-contract-to-render assertions are machine-checkable
- breakpoint contradictions and major responsive regressions are detectable
- structural WCAG lint is available in addition to scanner outputs
- additional reviewer/validator skills are added only if existing review surfaces cannot cover evidence interpretation
- reviewer/validator skill outputs remain bounded evidence synthesis and not compliance authority or generic UX critique

## Staging Gate Between Waves

Wave 2 must not begin until Wave 1 baseline is stable and reproducible:

- deterministic local fixture rendering
- reproducible Axe outputs
- normalized Lighthouse outputs
- working eval runner integration for `render-layout` and `wcag-a11y`
- explicit `nonClaims` sections in tool outputs
- no unresolved dependency/runtime uncertainty for baseline toolchain

## False-Positive Control

Required finding status taxonomy across render/a11y/contract checks:

- `confirmed-issue`
- `likely-issue`
- `manual-review-area`
- `not-assessed`

Small visual differences are non-blocking unless readability, hierarchy, grouping, overflow, or responsive constraints are violated.

## Explicit Non-Claims

- automated checks provide bounded evidence, not complete legal conformance proof
- scanner or score outputs do not replace manual assistive-technology validation
- rendered evidence outputs do not imply production readiness without passing blocking evals
