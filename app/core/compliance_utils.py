"""
app/core/compliance_utils.py — Shared compliance record merge logic.

Single authoritative implementation imported by scan_service.py and worker.py.
"""


def merge_compliance(base: dict, new: dict) -> None:
    """
    Deep-merge compliance record *new* into *base* in-place.

    - Skips blurred / hint sentinel keys.
    - Merges articles / sections / functions as sorted sets.
    - Keeps the maximum fine value for fine_eur / fine_inr.
    """
    if not new or new.get("blurred"):
        return
    for fw, data in new.items():
        if fw in ("blurred", "hint"):
            continue
        if fw not in base:
            base[fw] = data
        else:
            for key in ("articles", "sections", "functions"):
                if key in data:
                    merged = set(base[fw].get(key, []))
                    merged.update(data[key])
                    base[fw][key] = sorted(merged)
            if "fine_eur" in data:
                base[fw]["fine_eur"] = max(base[fw].get("fine_eur", 0), data["fine_eur"])
            if "fine_inr" in data:
                base[fw]["fine_inr"] = max(base[fw].get("fine_inr", 0), data["fine_inr"])
