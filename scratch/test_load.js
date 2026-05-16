require("dotenv").config();
console.log("Loading modules...");
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
console.log("Loading routes...");
try {
    require("./server/routes/auth");
    console.log("Auth routes loaded");
    require("./server/routes/prescriptions");
    console.log("Prescription routes loaded");
} catch (e) {
    console.error("Error loading routes:", e);
}
console.log("Done.");
