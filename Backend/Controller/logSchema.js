import mongoose from "mongoose";

const logSchema = new mongoose.Schema({
    timestamp: String,
    Category: String,
    level: String,
    userName: String,
    endPoint: String,
    message: String,
},{ versionKey: false });


export const Log = mongoose.model("log", logSchema);

