import { retrieveRelevantChunks } from '../rag/retriever.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export class SearchController {
  async search(req, res) {
    const { query, topK } = req.body;
    const results = await retrieveRelevantChunks({
      userId: req.user.id,
      chatId: req.params.chatId,
      query,
      topK,
    });

    return ApiResponse.success(res, 200, { results });
  }
}

export const searchController = new SearchController();

