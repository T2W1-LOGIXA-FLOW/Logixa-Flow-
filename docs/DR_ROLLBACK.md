# Logixa Flow — Disaster Recovery and Rollback

> Owner: Engineering / Operations
> Status: PRE-STAGED
> Last Updated: 2026-10-08

## Purpose

This document defines the evidence required before release freeze for database recovery, provider recovery, application rollback, and data-integrity verification.

## Required drills

1. Record the exact repository release SHA and live migration head.
2. Create or verify a restorable database backup/snapshot using the production control plane.
3. Restore into an isolated target; verify schema head, row counts, workflow terminal states, and critical publication/session records.
4. Verify object-storage recovery for the configured providers without exposing credentials.
5. Rehearse application rollback to the previous known-good release.
6. Re-run authentication, workflow, RAG, and publication smoke checks after rollback.
7. Reconcile data-integrity differences and document the result before declaring recovery successful.

## Current state

Repository-side rollback/recovery contracts are partially staged through deterministic workflow recovery tests and release-gate automation. Actual production backup/restore and rollback remain live operational gates and must not be inferred from configuration alone.

## Exit evidence

A recovery drill is VERIFIED only when the restored system is independently checked and the evidence records the release SHA, migration head, timestamps, test results, and any data-integrity exceptions.
