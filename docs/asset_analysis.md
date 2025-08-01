# Asset Analysis

This document compares the assets referenced by the original 2D game with the assets present in the VR port. It also lists assets that currently have no in-game references.

The script `scripts/checkAssetUsage.js` extracts all asset names from `Eternal-Momentum-OLD GAME/index.html` and scans the VR source for matching references. Running the script will report any assets that exist in the old game but are unused in the VR code.

At the time of writing, every old asset except `aspectDefeated` and `shaperFail` is referenced somewhere in the VR project. These two sounds were present in the original game's HTML but were never referenced in its code and remain unused in the VR port.
