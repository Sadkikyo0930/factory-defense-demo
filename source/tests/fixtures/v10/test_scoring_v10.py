"""V1.0 simplified three-station accounting reference; NOT the real 10-hour scheduling engine."""
import json
from pathlib import Path
from math import isclose

STAGES = ("祛除", "贴胶", "BD")
POTENTIAL = {"祛除": 40, "贴胶": 40, "BD": 60}


def simulate(cfg, deployed):
    per_worker = {
        "祛除": cfg["capacities_per_worker"]["祛除"],
        "贴胶": cfg["capacities_per_worker"]["贴胶_COF"] // cfg["cof_per_sheet"],
        "BD": cfg["capacities_per_worker"]["BD"],
    }
    wip = {s: cfg["initial_wip"][s] + cfg["independent_in"][s] for s in STAGES}
    completed = {}
    for idx, stage in enumerate(STAGES):
        done = min(wip[stage], deployed[stage] * per_worker[stage])
        wip[stage] -= done
        completed[stage] = done
        if idx < len(STAGES) - 1:
            wip[STAGES[idx + 1]] += done
    exits = completed[STAGES[-1]]
    total_input = sum(cfg["initial_wip"].values()) + sum(cfg["independent_in"].values())
    assert sum(wip.values()) + exits == total_input, "Physical piece conservation violated"
    return {"completed": completed, "closing_wip": wip, "segment_exit": exits}


def redundant_count(cfg, deployed, result):
    """Greedy remove-one-and-rerun check with stable ordering."""
    work = deployed.copy()
    redundant = 0
    for stage in STAGES:
        while work[stage] > 0:
            candidate = work.copy()
            candidate[stage] -= 1
            counterfactual = simulate(cfg, candidate)
            good_wip = all(
                counterfactual["closing_wip"][s]
                <= max(cfg["target_closing_wip"][s], result["closing_wip"][s])
                for s in STAGES
            )
            if good_wip and counterfactual["segment_exit"] >= result["segment_exit"]:
                work = candidate
                redundant += 1
            else:
                break
    return redundant


def score(cfg, deployed):
    result = simulate(cfg, deployed)
    target_score = 0
    for stage in STAGES:
        ending = result["closing_wip"][stage]
        target = cfg["target_closing_wip"][stage]
        if ending <= target:
            hit = 1.0
        else:
            hit = max(0.0, 1.0 - (ending - target) / max(1, POTENTIAL[stage] - target))
        target_score += 60.0 * hit / len(STAGES)
    redundant = redundant_count(cfg, deployed, result)
    assigned = sum(deployed.values())
    staff_score = 25.0 * (assigned - redundant) / assigned if assigned else 0.0
    out_score = 15.0 * min(1.0, result["segment_exit"] / 60.0)
    return result | {"redundant": redundant, "parts": [target_score, staff_score, out_score], "total_score": round(target_score + staff_score + out_score, 1)}


def main():
    cfg = json.loads(Path(__file__).with_name("three_scenarios.json").read_text(encoding="utf-8"))
    for scenario in cfg["scenarios"]:
        got = score(cfg, scenario["deployed"])
        expected = scenario["expected"]
        for key in ("completed", "closing_wip", "segment_exit", "redundant"):
            assert got[key] == expected[key], (scenario["id"], key, got[key], expected[key])
        assert isclose(got["total_score"], expected["total_score"], abs_tol=1e-9)
        print(f'{scenario["id"]} {scenario["name"]}: {got["total_score"]:.1f}/100; components={tuple(round(x, 2) for x in got["parts"])}; passed')
    print("All 3 scenarios passed.")


if __name__ == "__main__":
    main()
