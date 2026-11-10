export class ApiResponse {
  static success(res, statusCode = 200, data, message) {
    if (statusCode === 204) {
      return res.status(204).send();
    }

    if (data && typeof data === 'object' && !Array.isArray(data)) {
      if (message) {
        return res.status(statusCode).json({ ...data, message });
      }
      return res.status(statusCode).json(data);
    }

    if (data !== undefined) {
      return res.status(statusCode).json({ data, ...(message ? { message } : {}) });
    }

    return res.status(statusCode).json({ ...(message ? { message } : { success: true }) });
  }

  static created(res, data, message) {
    return ApiResponse.success(res, 201, data, message);
  }

  static accepted(res, data, message) {
    return ApiResponse.success(res, 202, data, message);
  }

  static noContent(res) {
    return res.status(204).send();
  }
}

