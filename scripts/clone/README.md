# Clone Scripts

This directory contains utility scripts for validating local Postgres installations and executing fail-closed Supabase data clones between production and staging.

They are intentionally untracked in Git using the `.gitignore` rule, as they contain environmental dependencies and specific connection strings for the local machine executing the migration. DO NOT hardcode production secrets directly in these scripts if committing to a public or shared repository.
