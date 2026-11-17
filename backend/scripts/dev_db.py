"""Start a persistent local Postgres for development (no Docker needed). Prints the database URL."""

import socket
import subprocess
import tempfile
from pathlib import Path

import pgserver

DATA = Path(__file__).resolve().parent.parent / ".pgdata"
PG_BIN = Path(pgserver.__file__).parent / "pginstall" / "bin"
PG_CTL = PG_BIN / "pg_ctl.exe"


def _free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def _cluster_state() -> str:
    out = subprocess.run(
        [str(PG_BIN / "pg_controldata.exe"), "-D", str(DATA)], capture_output=True, text=True
    ).stdout
    for line in out.splitlines():
        if line.startswith("Database cluster state:"):
            return line.split(":", 1)[1].strip()
    return "unknown"


def recover_after_unclean_shutdown() -> None:
    """pgserver keeps its log inside the data dir. After a crash, Postgres fsyncs every file there
    during recovery and Windows refuses the open log file, so recovery never ends. Run recovery
    once with the log outside the data dir, then stop cleanly."""
    if not DATA.exists() or not PG_CTL.exists() or _cluster_state() == "shut down":
        return
    status = subprocess.run([str(PG_CTL), "-D", str(DATA), "status"], capture_output=True)
    if status.returncode == 0:
        return  # a live server is running on this data dir
    (DATA / "postmaster.pid").unlink(missing_ok=True)
    log = Path(tempfile.gettempdir()) / "artrat-pg-recovery.log"
    # DEVNULL, not captured pipes: the postmaster inherits them and would keep run() waiting.
    quiet = {"check": True, "stdout": subprocess.DEVNULL, "stderr": subprocess.DEVNULL}
    port = _free_port()
    subprocess.run(
        [str(PG_CTL), "-D", str(DATA), "-w", "-t", "120",
         "-o", f"-p {port} -c listen_addresses=127.0.0.1", "-l", str(log), "start"],
        **quiet,
    )
    subprocess.run([str(PG_CTL), "-D", str(DATA), "-w", "-m", "fast", "stop"], **quiet)


if __name__ == "__main__":
    recover_after_unclean_shutdown()
    server = pgserver.get_server(DATA, cleanup_mode=None)
    print(server.get_uri().replace("postgresql://", "postgresql+psycopg://"))
