import { Request, Response } from 'express';
import {
  AutocompleteOptions,
  locationService,
} from '../services/LocationService';
import { LocationAutocompleteResponse } from '../models/Location';

export class LocationController {
  async autocomplete(req: Request, res: Response): Promise<void> {
    try {
      const rawQuery =
        (typeof req.query.q === 'string' && req.query.q) ||
        (typeof req.query.query === 'string' && req.query.query) ||
        '';

      const query = rawQuery.trim();

      if (!query) {
        res.status(400).json({
          success: false,
          error: 'Query parameter "q" is required for location autocomplete.',
        });
        return;
      }

      if (query.length < 2) {
        res.status(400).json({
          success: false,
          error: 'Query must be at least 2 characters long.',
        });
        return;
      }

      const options = this.buildOptions(req.query);

      const suggestions = await locationService.autocomplete(query, options);

      res.json({
        success: true,
        data: suggestions,
      } as LocationAutocompleteResponse);
    } catch (error) {
      console.error('Location autocomplete error:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to fetch location suggestions at this time.';

      res.status(502).json({
        success: false,
        error: message,
      });
    }
  }

  private parseLimit(limitParam: unknown): number | undefined {
    if (typeof limitParam !== 'string') {
      return undefined;
    }

    const limit = parseInt(limitParam, 10);

    if (Number.isNaN(limit)) {
      return undefined;
    }

    const clamped = Math.min(Math.max(limit, 1), 15);
    return clamped;
  }

  private buildOptions(query: Request['query']): AutocompleteOptions {
    const limit = this.parseLimit(query.limit);
    const countryCodes =
      typeof query.countryCodes === 'string'
        ? query.countryCodes
        : typeof query.countrycodes === 'string'
          ? query.countrycodes
          : undefined;

    const viewbox =
      typeof query.viewbox === 'string' ? query.viewbox : undefined;
    const bounded = this.parseBoolean(query.bounded);
    const tag = typeof query.tag === 'string' ? query.tag : undefined;

    const options: AutocompleteOptions = {};

    if (typeof limit === 'number') {
      options.limit = limit;
    }

    if (countryCodes) {
      options.countryCodes = countryCodes;
    }

    if (viewbox) {
      options.viewbox = viewbox;
    }

    if (typeof bounded === 'boolean') {
      options.bounded = bounded;
    }

    if (tag) {
      options.tag = tag;
    }

    return options;
  }

  private parseBoolean(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value !== 'string') {
      return undefined;
    }

    if (['true', '1', 'yes', 'y'].includes(value.toLowerCase())) {
      return true;
    }

    if (['false', '0', 'no', 'n'].includes(value.toLowerCase())) {
      return false;
    }

    return undefined;
  }
}

export const locationController = new LocationController();
