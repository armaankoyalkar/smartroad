# Dataset directory

Raw and processed data files are never committed to git (see the root `.gitignore`). This directory holds the dataset card, download scripts and instructions so that anyone can reproduce the ML pipeline.

## Rules

- Before using any dataset, complete the dataset card below and get the licence checked by the team.
- Record the exact access date and the exact URL you downloaded from.
- Keep raw files under `dataset/raw/` and cleaned files under `dataset/processed/`; both are ignored by git.
- SmartRoad's own seed data (`source: "seed"`) is never used as training data.

## Dataset card (fill in during Phase 8)

| Item | Value |
|---|---|
| Dataset name | |
| Publisher | |
| Source URL | |
| Access date | |
| Licence (exact name and link) | |
| Citation requested by the publisher | |
| Files used and sizes | |
| Number of records before cleaning | |
| Number of records after cleaning | |
| Target variable and how LOW/MEDIUM/HIGH are derived | |
| Class balance (counts per class) | |
| Features used, with type and allowed values | |
| Features present in the dataset but not used, and why | |
| Missing values and how they were handled | |
| Geographic coverage | |
| Temporal coverage | |
| Known limitations and biases | |
| Why this dataset was chosen over the alternatives in `docs/06-project-plan.md` section 6 | |

Candidates assessed in Phase 1 are listed in `docs/06-project-plan.md` section 6.2.
