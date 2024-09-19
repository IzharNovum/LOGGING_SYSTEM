import app from "./app.js";

app.listen(process.env.PORT, ()=>{
    console.log("Test Server Is Running On:", process.env.PORT);
})