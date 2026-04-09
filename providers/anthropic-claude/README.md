# Anthropic-Claude Provider Adapter

Status: scaffolded.

This directory is the canonical provider-specific export boundary for Claude-compatible packaging.

## Current State

- canonical behavior stays in the portable core
- this adapter compiles the portable core into Claude packaging and transport metadata

## Non-Goals

- no provider-specific behavior becomes canonical here
- no hidden policy or approval logic is allowed to bypass the shared core

