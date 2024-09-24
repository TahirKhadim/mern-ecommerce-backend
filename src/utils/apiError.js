class apiError extends Error{
    constructor(
        statusCode,
        message = "Somethig went wrong",
        error = [],
        stack = ""
      ) {
        super(message),
          (this.statusCode = statusCode),
          (this.data = null),
          (this.message = message),
          (this.success = false),
          (this.errors = this.errors);
      }
}

export {apiError};