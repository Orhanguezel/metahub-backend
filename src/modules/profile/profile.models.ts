import { Schema, model, Types } from "mongoose";
import { nameRegex, phoneRegex } from "../../core/utils/regex";
import { encryptData, decryptData } from "../../core/utils/encription.helper";

const personalInfoSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    firstname: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
      validate: {
        validator: (val: string) => nameRegex.test(val),
        message: "Firstname must contain only letters",
      },
    },
    secondName: {
      type: String,
      trim: true,
      minlength: 3,
      maxlength: 50,
      validate: {
        validator: (val: string) => nameRegex.test(val),
        message: "Second name must contain only letters",
      },
    },
    lastname: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
      validate: {
        validator: (val: string) => nameRegex.test(val),
        message: "Lastname must contain only letters",
      },
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 20,
      validate: {
        validator: (val: string) => phoneRegex.test(val),
        message: "Invalid phone number format",
      },
      set: (val: string) => encryptData(val),
      get: (val: string) => decryptData(val),
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

const PersonalData = model("PersonalData", personalInfoSchema);

export default PersonalData;
