---
sidebar_position: 1
profile_template: {kind: wiki, version: 1}
profile_format: 1
---

# 🛠️ Resume access and public boundaries

## Current document access

The [resume access entry](/about/resume/) directs inquiries to LinkedIn. Previous Selected CV and Full CV routes display compatibility instructions only. Login, request storage, and approval are not implemented.

Public work remains available through the [portfolio](/about/portfolio/) and existing blog articles.

## Sources and editing {#data-contract}

Detailed career facts, role selections, and document exports belong in the separate private workspace. This public site does not depend on them. Author only approved public descriptions in localized MDX. Draft flags and browser hostnames are not privacy controls.

## Validation {#validation-resume-lint}

Public builds must not expose private career bodies, generated career JSON, CV tag entries, or PDF exports. Run content tests and publication checks after building. Browser verification covers both locales, legacy routes, responsive navigation, and the LinkedIn link.

A4 page counts and private-document readability are checked in the private workspace. Historical public copies and Git history are not erased by this migration.
