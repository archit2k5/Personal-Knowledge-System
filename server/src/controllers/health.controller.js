import mongoose from 'mongoose';
import { ApiResponse } from '../utils/ApiResponse.js';
import { qdrant } from '../rag/qdrant.js';

export class HealthController {
  async getHealth(_req, res) {
    return ApiResponse.success(res, 200, { status: 'ok' });
  }

  async getHealthDeps(_req, res) {
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

    let qdrantStatus = 'disconnected';
    try {
      await qdrant.getCollections();
      qdrantStatus = 'connected';
    } catch {
      qdrantStatus = 'disconnected';
    }

    return ApiResponse.success(res, 200, {
      status: 'ok',
      dependencies: {
        mongo: mongoStatus,
        qdrant: qdrantStatus,
      },
    });
  }
}

export const healthController = new HealthController();

