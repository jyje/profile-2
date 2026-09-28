# Shared career records

Edit `.yaml` sources here. Build output under `src/generated/` is disposable.

- `work/` and `projects/`: one record per employer or project.
- Other categories: one file containing short records of that kind.
- `index.yaml`: Full CV display order for work/projects and the available profiles.
- `profiles/`: candidate title, bilingual summary, and explicit document selections.
- `basics.yaml`: contact and identity data. `additional.yaml` retains the other imported source fields.

## Record contract

Every record has a stable `id`. Work, projects, education and skills also have an
immutable `anchor` for existing CV/tag links. Changing catalog order must not
change these anchors. Put shared metadata outside `ko`/`en`; put prose inside
those locale objects. Add the same responsibility/outcome IDs in both languages.

| Field | Meaning |
| --- | --- |
| `title` | Employer or project heading |
| `role` | Actual historical position or project responsibility |
| `summary` | Optional one-line record overview |
| `description` | Optional longer record narrative |
| `period.start`, `period.end` | Shared ISO dates; `null` end means ongoing |
| `contribution` | Optional verified project percentage, from 0 to 100 |
| `responsibilities` | List of duties with stable IDs |
| `outcomes` | List of outcomes with stable IDs |
| Item `title` | Optional short outcome/duty heading |
| Item `summary` | Required concise expression of the fact |
| Item `detail` | Optional expanded expression of the same fact |

The project `on-prem-mlops.yaml` is an authored example with shared dates and
contribution, bilingual outcome IDs, and summary/detail expressions. Detail falls
back to summary when no expanded expression has been authored. Do not create
placeholder claims, infer metrics, or relabel GPU research utilization as inference
throughput. Certification issue/expiry history remains as authored.

## Profile contract

Resume references select explicit duties/outcomes, including their text field:

```yaml
projects:
  - id: on-prem-mlops
    outcomes:
      - id: gpu-utilization
        text: summary
```

Selected CV includes all details of the chosen record:

```yaml
projects:
  - id: on-prem-mlops
    text: detail
```

Skills reference their stable group ID and exact authored keyword text. Other
categories reference record IDs. Career source facts are never copied into
profiles. Full CV includes every catalog record independently of role profiles.

Run `npm run typecheck` and `npm run test:content` after edits. Sync/build rejects
unknown IDs, duplicate IDs/anchors, orphaned record files, invalid fields and
bilingual mismatches. Run `npm run export:pdf` against an all-locale server after
changes to selections or text lengths. All six resumes must remain one A4 page.
