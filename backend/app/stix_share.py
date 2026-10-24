"""Synthetic STIX 2.1 indicator sharing, validated with the `stix2` library.

A match flags EXPOSURE, never confirmed compromise. The hub is locally simulated.
"""
from __future__ import annotations

import stix2

# Synthetic IOCs (RFC 5737 TEST-NET addresses — never real hosts).
ATTACKER_IP = "203.0.113.47"
MALWARE_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
AFFECTED_FAMILY = "acme-opcua-gw 2.3"

# Receiving-site synthetic inventories.
INVENTORIES = {
    "cleveland-clinic": ["acme-opcua-gw 2.3.1", "bms-bacnet 4.0"],
    "dewa-nad-hessa": ["acme-opcua-gw 2.2.9", "iec61850-gw 1.4"],
    "taweelah": ["acme-opcua-gw 2.3.0"],
}


def build_bundle() -> dict:
    """Build and validate a STIX 2.1 bundle (identity + indicator + attack-pattern + relationship)."""
    identity = stix2.Identity(
        name="FALAJ National SOC (simulated)", identity_class="organization",
        description="Locally-simulated coordination hub. Not a real National SOC.",
    )
    indicator = stix2.Indicator(
        name="Suspicious OT remote-access toolkit (synthetic)",
        description="Synthetic IOC set from the Taweelah scenario. Demonstration only.",
        indicator_types=["malicious-activity"],
        pattern=f"[ipv4-addr:value = '{ATTACKER_IP}' OR file:hashes.'SHA-256' = '{MALWARE_SHA256}']",
        pattern_type="stix", created_by_ref=identity.id,
    )
    attack_pattern = stix2.AttackPattern(
        name="Remote Services -> Unauthorized Command Message",
        description="MITRE ATT&CK for ICS: T0883 -> T0831.",
        external_references=[
            {"source_name": "mitre-attack-ics", "external_id": "T0883"},
            {"source_name": "mitre-attack-ics", "external_id": "T0831"},
        ],
    )
    relationship = stix2.Relationship(indicator, "indicates", attack_pattern)
    bundle = stix2.Bundle(identity, indicator, attack_pattern, relationship, allow_custom=False)
    # Round-trip parse validates the bundle structure.
    stix2.parse(bundle.serialize(), allow_custom=False)
    return bundle.serialize(pretty=False)


def match_sites(source_facility_id: str = "taweelah") -> list[dict]:
    """Evaluate each receiving site independently against the shared indicator."""
    results = []
    for fid, software in INVENTORIES.items():
        if fid == source_facility_id:
            continue
        exact = any(sw.startswith(AFFECTED_FAMILY) for sw in software)
        family = any(sw.startswith("acme-opcua-gw") for sw in software)
        if exact:
            result, reason, rec = ("match",
                "Runs the exact affected gateway version in the indicator.",
                "Patch the OPC-UA gateway now; block the indicator IP; hunt for the hash.")
        elif family:
            result, reason, rec = ("exposure",
                "Runs the same gateway family but a different patch level.",
                "Verify version, apply vendor advisory, add detection for the indicator IP.")
        else:
            result, reason, rec = ("nomatch", "No matching software or exposed service.", "No action; keep on watch.")
        results.append({"facilityId": fid, "result": result, "reason": reason, "recommendation": rec})
    return results
