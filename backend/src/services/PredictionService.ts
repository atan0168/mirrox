import axios from 'axios';
import config from '../utils/config';

export interface PredictQuery {
  state: string;
  season_lags?: number; // default 3
  trend_lags?: number; // default 2
  season_threshold?: number; // 0..1
  trend_threshold?: number; // 0..1
  ref_year?: number;
  ref_ew?: number;
  live?: boolean; // default true
}

export interface PredictResponse {
  state: string;
  as_of: {
    ew_year: number;
    ew: number;
    week_start: string; // ISO date
    week_end: string; // ISO date
    source: 'live' | 'csv' | string;
  };
  season: {
    lags: number;
    prob_in_season: number;
    in_season: boolean;
    threshold: number;
  };
  trend: {
    lags: number;
    prob_trend_increase_next_week: number;
    trend_increase: boolean;
    threshold: number;
  };
}

class PredictionService {
  private baseUrl = config.pythonPredict.baseUrl.replace(/\/$/, '');

  async predict(query: PredictQuery): Promise<PredictResponse> {
    const url = `${this.baseUrl}/predict`;
    const params: Record<string, any> = {};

    // required
    params.state = query.state;

    // optional: include only if provided to let service defaults apply
    if (query.season_lags !== undefined) params.season_lags = query.season_lags;
    if (query.trend_lags !== undefined) params.trend_lags = query.trend_lags;
    if (query.season_threshold !== undefined)
      params.season_threshold = query.season_threshold;
    if (query.trend_threshold !== undefined)
      params.trend_threshold = query.trend_threshold;
    if (query.ref_year !== undefined) params.ref_year = query.ref_year;
    if (query.ref_ew !== undefined) params.ref_ew = query.ref_ew;
    if (query.live !== undefined) params.live = query.live;

    const { data } = await axios.get(url, {
      params,
      timeout: config.pythonPredict.timeoutMs,
    });
    return data as PredictResponse;
  }
}

export const predictionService = new PredictionService();
