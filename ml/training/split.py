"""Step 5: stratified train/test split with a fixed random_state."""

from __future__ import annotations

import pandas as pd
from sklearn.model_selection import train_test_split

from app.constants import RISK_LEVELS


def stratified_split(
    frame: pd.DataFrame, target: str, test_size: float, random_state: int
) -> tuple[pd.DataFrame, pd.DataFrame]:
    train, test = train_test_split(
        frame, test_size=test_size, random_state=random_state, stratify=frame[target], shuffle=True
    )
    return train.reset_index(drop=True), test.reset_index(drop=True)


def class_distribution(values: pd.Series) -> dict[str, int]:
    counts = values.value_counts()
    return {level: int(counts.get(level, 0)) for level in RISK_LEVELS}
