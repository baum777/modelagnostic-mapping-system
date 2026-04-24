# TSC Examples

Derived TSC declaration examples for contract review.

- `manual-trigger.json`: manual trigger baseline
- `cron-trigger.json`: cron trigger with timezone and jitter
- `workflow-completion-trigger.json`: trigger on upstream workflow outcome
- `threshold-trigger-with-precondition.json`: threshold trigger with precondition gate

These are contract examples only.
They do not define scheduler runtime, cron execution, webhook serving, queue consuming, file watching, or threshold monitoring runtime behavior.
