import Joi from "joi";

const createUserSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(100).required().messages({
    "string.empty": "First name is required.",
  }),

  lastName: Joi.string().trim().min(1).max(100).required().messages({
    "string.empty": "Last name is required.",
  }),

  email: Joi.string().trim().email().required().messages({
    "string.empty": "Email is required.",
    "string.email": "Must be a valid email address.",
  }),

  password: Joi.string()
    .min(8)
    .pattern(new RegExp("(?=.*[A-Z])(?=.*[0-9])"))
    .required()
    .messages({
      "string.empty": "Password is required.",
      "string.min": "Password must be at least 8 characters long.",
      "string.pattern.base":
        "Password must contain at least one uppercase letter and one number.",
    }),

  phoneNumber: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .allow("", null)
    .messages({
      "string.pattern.base":
        "Must be a valid E.164 phone number (e.g., +94771234567).",
    }),

  role: Joi.string().valid("admin", "bidder").default("bidder"),
  validated: Joi.boolean().default(false),
});

export const validateCreateUser = (req, res, next) => {
  const { error, value } = createUserSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorDetails = error.details.map((detail) => ({
      field: detail.context.key,
      message: detail.message,
    }));

    return res.status(400).json({
      message: errorDetails[0].message,
      details: errorDetails,
    });
  }

  req.body = value;
  next();
};

export const validateUserIdParam = (req, res, next) => {
  const validateIdParamSchema = Joi.object({
    id: Joi.number().integer().positive().required(),
  });

  const { error } = validateIdParamSchema.validate(req.params);

  if (error) {
    return res.status(400).json({
      message: "Invalid ID parameter",
      details: error.details[0].message,
    });
  }

  next();
};
