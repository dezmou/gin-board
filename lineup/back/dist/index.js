"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const bdd_1 = require("./bdd");
const cors = require("cors");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    // cors : {
    //     origin : "*",
    // }
    path: '/api',
});
const sendState = (socket, state) => {
    socket.emit("newState", JSON.stringify(state));
};
const lobby = {};
const userIdToSocket = {};
const socketIdToUserId = {};
const updateLobby = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!userIdToSocket[userId]) {
        if (lobby[userId]) {
            delete lobby[userId];
        }
    }
    else {
        if (!lobby[userId]) {
            const user = (yield (0, bdd_1.getUser)(userId));
            lobby[userId] = {
                elo: user.user.elo,
                id: userId,
                name: user.user.name,
                status: user.page === "lobby" ? "online" : "inGame"
            };
        }
    }
    io.emit("lobby", JSON.stringify(lobby));
});
bdd_1.onReady.subscribe(() => {
    io.on('connection', (socket) => {
        console.log("USER CON");
        socket.emit("welcome", socket.id);
        socket.on("challenge", (p) => __awaiter(void 0, void 0, void 0, function* () {
            const param = JSON.parse(p);
            const user = yield (0, bdd_1.getUser)(param.id);
            console.log(`${param.user.id} challenge ${user.user.name}`);
        }));
        socket.on("login", (p) => __awaiter(void 0, void 0, void 0, function* () {
            const param = JSON.parse(p);
            const res = yield (0, bdd_1.getUserByName)(param.name);
            if (!res || param.password !== res.password) {
                socket.emit("toast", JSON.stringify({
                    color: "red",
                    msg: "Wrong username or password",
                    time: 4000,
                }));
                return;
            }
            socket.emit("connected", JSON.stringify({ id: res._id, token: res.token }));
        }));
        socket.on("createUser", (p) => __awaiter(void 0, void 0, void 0, function* () {
            const param = JSON.parse(p);
            try {
                const user = yield (0, bdd_1.addUser)(param.name, param.password);
                socket.emit("connected", JSON.stringify({ id: user.id, token: user.token }));
            }
            catch (e) {
                if (e === "USER_EXIST") {
                    socket.emit("toast", JSON.stringify({
                        color: "red",
                        msg: "User name exist Already",
                        time: 4000,
                    }));
                    return;
                }
            }
        }));
        socket.on("disconnect", () => {
            const userId = socketIdToUserId[socket.id];
            if (userId) {
                delete socketIdToUserId[socket.id];
                delete userIdToSocket[userId];
                console.log("ROEIGJOIRJGOIPRJGOP", userId);
                updateLobby(userId);
            }
        });
        socket.on("askState", (p) => __awaiter(void 0, void 0, void 0, function* () {
            const param = JSON.parse(p);
            if (!param.user) {
                return sendState(socket, {
                    page: "login",
                    render: ["login"]
                });
            }
            else {
                const res = yield (0, bdd_1.getUser)(param.user.id);
                if (!res || res.user.token !== param.user.token) {
                    return sendState(socket, {
                        page: "login",
                        render: ["login"]
                    });
                }
                else {
                    if (!userIdToSocket[param.user.id]) {
                        userIdToSocket[param.user.id] = socket;
                        socketIdToUserId[socket.id] = param.user.id;
                        updateLobby(param.user.id);
                    }
                    return sendState(socket, res);
                }
            }
        }));
    });
    server.listen({
        port: 3001,
        host: "0.0.0.0",
    }, () => {
        console.log("SERVER STARTED");
    });
});
