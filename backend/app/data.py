"""Synthetic topologies, scenarios and containment actions (mirrors frontend/src/sim)."""
from __future__ import annotations

from .models import Scenario, SimEdge, SimNode, Stage, Impact, Metric


def _n(id, label, kind, zone, critical=False, controls=None):
    return SimNode(id=id, label=label, kind=kind, zone=zone, critical=critical, controls=controls or [])


def _e(frm, to, protocol=None, guarded=False):
    return SimEdge(frm=frm, to=to, protocol=protocol, guarded=guarded)


TOPOLOGIES: dict[str, dict] = {
    "taweelah": {
        "facilityId": "taweelah", "sector": "water",
        "nodes": [
            _n("tw-ws-eng", "Engineering Workstation", "workstation", "IT", controls=["AD auth"]),
            _n("tw-ws-remote", "Remote Access Gateway", "server", "IT", controls=["VPN", "MFA (optional)"]),
            _n("tw-fw-it", "IT/DMZ Firewall", "firewall", "DMZ", controls=["segmentation"]),
            _n("tw-hist", "Process Historian", "historian", "DMZ"),
            _n("tw-fw-ot", "OT Firewall / Data Diode", "firewall", "OT", controls=["segmentation"]),
            _n("tw-scada", "SCADA Server", "server", "OT"),
            _n("tw-hmi", "Control Room HMI", "hmi", "CONTROL", controls=["operator login"]),
            _n("tw-plc-intake", "PLC — Seawater Intake", "plc", "CONTROL", controls=["write-protect (optional)"]),
            _n("tw-plc-ro", "PLC — RO Trains", "plc", "CONTROL", critical=True, controls=["write-protect (optional)"]),
            _n("tw-plc-pump", "PLC — High-Pressure Pumps", "plc", "CONTROL", critical=True, controls=["write-protect (optional)"]),
            _n("tw-pump-1", "HP Pump Station", "pump", "FIELD", critical=True),
            _n("tw-valve-prod", "Product-Water Valve", "valve", "FIELD", critical=True),
            _n("tw-tank", "Potable Storage Reservoir", "tank", "FIELD", critical=True),
            _n("tw-sensor-flow", "Product Flow Sensor", "sensor", "FIELD"),
        ],
        "edges": [
            _e("tw-ws-eng", "tw-fw-it", "RDP"), _e("tw-ws-remote", "tw-fw-it", "VPN"),
            _e("tw-fw-it", "tw-hist", "SQL", True), _e("tw-fw-it", "tw-fw-ot", "OPC-UA", True),
            _e("tw-hist", "tw-fw-ot", "OPC-UA"), _e("tw-fw-ot", "tw-scada", "OPC-UA", True),
            _e("tw-scada", "tw-hmi", "proprietary"), _e("tw-scada", "tw-plc-intake", "Modbus/TCP"),
            _e("tw-scada", "tw-plc-ro", "Modbus/TCP"), _e("tw-scada", "tw-plc-pump", "Modbus/TCP"),
            _e("tw-plc-pump", "tw-pump-1", "hardwired"), _e("tw-plc-ro", "tw-valve-prod", "hardwired"),
            _e("tw-pump-1", "tw-tank", "process"), _e("tw-valve-prod", "tw-tank", "process"),
            _e("tw-sensor-flow", "tw-scada", "telemetry"),
        ],
    },
    "cleveland-clinic": {
        "facilityId": "cleveland-clinic", "sector": "healthcare",
        "nodes": [
            _n("cc-ws", "Facilities Workstation", "workstation", "IT", controls=["AD auth"]),
            _n("cc-fw", "IT/OT Firewall", "firewall", "DMZ", controls=["segmentation"]),
            _n("cc-bms", "Building Mgmt Server (BMS)", "server", "OT"),
            _n("cc-hmi", "BMS Operator Panel", "hmi", "CONTROL", controls=["operator login"]),
            _n("cc-plc-hvac", "PLC — Clinical HVAC", "plc", "CONTROL", critical=True, controls=["write-protect (optional)"]),
            _n("cc-plc-power", "ATS — Backup Power", "rtu", "CONTROL", critical=True),
            _n("cc-ahu", "Operating-Theatre AHU", "valve", "FIELD", critical=True),
            _n("cc-sensor", "Cleanroom Pressure Sensor", "sensor", "FIELD"),
        ],
        "edges": [
            _e("cc-ws", "cc-fw", "HTTPS"), _e("cc-fw", "cc-bms", "BACnet", True),
            _e("cc-bms", "cc-hmi", "proprietary"), _e("cc-bms", "cc-plc-hvac", "BACnet/IP"),
            _e("cc-bms", "cc-plc-power", "Modbus/TCP"), _e("cc-plc-hvac", "cc-ahu", "hardwired"),
            _e("cc-sensor", "cc-bms", "telemetry"),
        ],
    },
    "dewa-nad-hessa": {
        "facilityId": "dewa-nad-hessa", "sector": "power",
        "nodes": [
            _n("dw-ws", "Protection Engineer WS", "workstation", "IT", controls=["AD auth"]),
            _n("dw-fw", "Station Firewall", "firewall", "DMZ", controls=["segmentation"]),
            _n("dw-gw", "Station Gateway (61850)", "server", "OT"),
            _n("dw-hmi", "Station HMI", "hmi", "CONTROL", controls=["operator login"]),
            _n("dw-ied-prot", "IED — Line Protection", "rtu", "CONTROL", critical=True, controls=["write-protect (optional)"]),
            _n("dw-ied-bus", "IED — Busbar Control", "rtu", "CONTROL", critical=True),
            _n("dw-breaker", "132 kV Breaker", "breaker", "FIELD", critical=True),
            _n("dw-tx", "132/11 kV Transformer", "transformer", "FIELD", critical=True),
        ],
        "edges": [
            _e("dw-ws", "dw-fw", "HTTPS"), _e("dw-fw", "dw-gw", "MMS", True),
            _e("dw-gw", "dw-hmi", "MMS"), _e("dw-gw", "dw-ied-prot", "IEC 61850 MMS"),
            _e("dw-gw", "dw-ied-bus", "IEC 61850 MMS"), _e("dw-ied-prot", "dw-breaker", "GOOSE"),
            _e("dw-ied-bus", "dw-tx", "hardwired"),
        ],
    },
}


def _stage(id, order, kind, nodeId, title, evidence, at, mitre=None, impact=None):
    return Stage(id=id, order=order, kind=kind, nodeId=nodeId, title=title, evidence=evidence, at=at, mitre=mitre, impact=impact)


SCENARIOS: dict[str, Scenario] = {
    "taweelah": Scenario(
        id="scn-taweelah-a", facilityId="taweelah", code="A",
        name="Suspicious Remote Access → Pump Disruption",
        summary="An anomalous remote login reaches the office network and moves laterally toward the OT pump controller.",
        path=["tw-ws-remote", "tw-fw-it", "tw-scada", "tw-plc-pump", "tw-pump-1", "tw-tank"],
        targetNodeId="tw-plc-pump", durationSec=30,
        stages=[
            _stage("s-a1", 1, "initial-access", "tw-ws-remote", "Anomalous remote login",
                   "VPN login from an unrecognised ASN at 03:14 local, no MFA.", 4, "T0883",
                   Impact(nodeId="tw-ws-remote", state="compromised", consequence="Foothold on the remote-access gateway.")),
            _stage("s-a2", 2, "lateral", "tw-fw-it", "Pivot through IT/DMZ",
                   "East-west connection to the historian over an unusual port.", 10, "T0886",
                   Impact(nodeId="tw-fw-it", state="alert")),
            _stage("s-a3", 3, "lateral", "tw-scada", "Reach SCADA server",
                   "OPC-UA session to SCADA from a DMZ host that never initiates control.", 17, "T0859",
                   Impact(nodeId="tw-scada", state="alert")),
            _stage("s-a4", 4, "impact", "tw-plc-pump", "Command high-pressure pump PLC",
                   "Unscheduled write to the pump PLC setpoint register.", 24, "T0831",
                   Impact(nodeId="tw-pump-1", state="offline",
                          metric=Metric(key="supply", to=0, unit="%", label="Product-water supply"),
                          consequence="High-pressure pump tripped — simulated water-supply disruption.")),
        ],
    ),
    "cleveland-clinic": Scenario(
        id="scn-cleveland-b", facilityId="cleveland-clinic", code="B",
        name="Unauthorised Control Write → Clinical HVAC",
        summary="A tampered setpoint write targets the operating-theatre air-handling unit.",
        path=["cc-ws", "cc-fw", "cc-bms", "cc-plc-hvac", "cc-ahu"],
        targetNodeId="cc-plc-hvac", durationSec=26,
        stages=[
            _stage("s-b1", 1, "initial-access", "cc-ws", "Compromised facilities workstation",
                   "Macro-enabled attachment spawns an outbound beacon.", 4, "T0817",
                   Impact(nodeId="cc-ws", state="compromised")),
            _stage("s-b2", 2, "lateral", "cc-bms", "Reach BMS server",
                   "BACnet write service invoked from a host with no prior BMS role.", 12, "T0886",
                   Impact(nodeId="cc-bms", state="alert")),
            _stage("s-b3", 3, "impact", "cc-plc-hvac", "Modify HVAC setpoint",
                   "Theatre AHU pressure setpoint driven below safe threshold.", 20, "T0836",
                   Impact(nodeId="cc-ahu", state="alert",
                          metric=Metric(key="pressure", to=-2, unit="Pa", label="Theatre differential pressure"),
                          consequence="Simulated loss of positive pressure in a critical clinical space.")),
        ],
    ),
    "dewa-nad-hessa": Scenario(
        id="scn-dewa-c", facilityId="dewa-nad-hessa", code="C",
        name="Shared Indicator → Substation Exposure Check",
        summary="A threat indicator from the water-plant incident is distributed and matched against the substation.",
        path=["dw-ws", "dw-fw", "dw-gw", "dw-ied-prot"],
        targetNodeId="dw-ied-prot", durationSec=22,
        stages=[
            _stage("s-c1", 1, "recon", "dw-ws", "Matched indicator received",
                   "STIX indicator matches the station gateway software baseline.", 5, "T0865",
                   Impact(nodeId="dw-gw", state="watch", consequence="Potential exposure flagged — not a confirmed compromise.")),
            _stage("s-c2", 2, "recon", "dw-ied-prot", "Protection IED exposure check",
                   "Line-protection IED runs a firmware version within the affected range.", 13, "T0888",
                   Impact(nodeId="dw-ied-prot", state="watch", consequence="Prioritised for patching — proactive.")),
        ],
    ),
}

CONTAINMENTS: dict[str, list[dict]] = {
    "taweelah": [
        {"id": "ct-isolate-gw", "label": "Isolate remote-access gateway", "nodeId": "tw-ws-remote", "isolatesEdge": ["tw-ws-remote", "tw-fw-it"]},
        {"id": "ct-writeprotect-pump", "label": "Engage pump-PLC write-protect", "nodeId": "tw-plc-pump", "isolatesEdge": ["tw-scada", "tw-plc-pump"]},
    ],
    "cleveland-clinic": [
        {"id": "ct-isolate-ws", "label": "Quarantine facilities workstation", "nodeId": "cc-ws", "isolatesEdge": ["cc-ws", "cc-fw"]},
        {"id": "ct-lock-hvac", "label": "Lock HVAC setpoints", "nodeId": "cc-plc-hvac", "isolatesEdge": ["cc-bms", "cc-plc-hvac"]},
    ],
    "dewa-nad-hessa": [
        {"id": "ct-patch-ied", "label": "Prioritise protection-IED patch", "nodeId": "dw-ied-prot"},
    ],
}


def seed_metrics(facility_id: str) -> list[dict]:
    if facility_id == "taweelah":
        return [{"key": "supply", "value": 100, "unit": "%", "label": "Product-water supply"}]
    if facility_id == "cleveland-clinic":
        return [{"key": "pressure", "value": 12, "unit": "Pa", "label": "Theatre differential pressure"}]
    return []
