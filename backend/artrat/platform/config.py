from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Every value comes from the environment (prefix ARTRAT_). See infra/.env.example."""

    model_config = SettingsConfigDict(env_prefix="ARTRAT_", env_file=".env", extra="ignore")

    database_url: str = Field(description="SQLAlchemy URL, e.g. postgresql+psycopg://...")
    browser_url: str = "http://localhost:8090"
    searxng_url: str = "http://localhost:8080"
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_model: str = "nvidia/nemotron-3-ultra-550b-a55b:free"
    openrouter_vision_model: str = "nvidia/nemotron-3.5-super-vl:free"
    openrouter_chat_text_model: str = "baidu/ernie-5.5-flash-preview:free"
    openrouter_chat_media_model: str = "nvidia/nemotron-3.5-super-vl:free"
    openrouter_chat_audio_model: str = "fish-audio/s2.1-pro-free:free"
    max_tokens_per_cycle: int = 200_000
    max_cost_usd_per_cycle: float = 2.0

    fetch_timeout_seconds: float = 30.0
    max_snapshot_bytes: int = 5_000_000
    user_agent: str = "ArtratBot/0.1 (+https://artrat.app/bot)"
    robots_agent: str = "ArtratBot"
    max_search_leads_per_query: int = 10

    # Discovery guardrails (docs/05 §5)
    max_depth: int = 3
    max_pages_per_site: int = 200
    site_delay_seconds: float = 5.0
    site_delay_jitter: float = 0.5  # delay is multiplied by 1 + uniform(0, jitter)
    lease_seconds: int = 300
    max_attempts: int = 3
    retry_base_seconds: float = 30.0
    thin_text_chars: int = 200  # static text shorter than this gets a browser render
    render_thin_pages: bool = True

    # Priority scoring weights (docs/05 §3)
    w_relevance: float = 1.0
    w_novelty: float = 0.8
    w_evidence_gap: float = 0.6
    w_freshness_due: float = 0.5
    w_demand: float = 0.9
    w_direction_yield: float = 1.2
    w_expected_cost: float = 0.3
    w_failure_penalty: float = 1.0


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
