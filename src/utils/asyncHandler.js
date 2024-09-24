const asyncHandler = (fn) => async (req, res, next) => {
    try {
        await fn(req, res, next);
    } catch (error) {
        // Set a default status code
        let statusCode = 500; // Internal Server Error

        // Check if error has a valid status code
        if (error.code && typeof error.code === 'number' && error.code >= 100 && error.code < 600) {
            statusCode = error.code;
        }

        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};

export { asyncHandler };
