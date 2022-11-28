import express from "express"
import http from "http"
import { Server, Socket } from "socket.io"
import { ApiCAll, AskState, CreateUser, State } from "./common/api.interface"
import { DefaultEventsMap } from "socket.io/dist/typed-events"
import { addUser, getUser, onReady } from "./bdd"

const cors = require("cors")
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    // cors : {
    //     origin : "*",
    // }
    path: '/api',
});

const sendState = (socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, state: State) => {
    socket.emit("newState", JSON.stringify(state))
}

const tokenSocket = {

}

onReady.subscribe(() => {
    io.on('connection', (socket) => {
        console.log("USER CON");
        socket.emit("welcome", socket.id)

        socket.on("createUser", async (p) => {
            const param = JSON.parse(p) as CreateUser
            const user = await addUser(param.name, param.password);
            socket.emit("connected", JSON.stringify({ id: user.id, token: user.token }))
        })

        socket.on("askState", async (p: string) => {
            const param = JSON.parse(p) as AskState
            if (!param.user) {
                return sendState(socket, {
                    page: "login",
                    render: ["login"]
                })
            } else {
                const res = await getUser(param.user.id)
                if (!res || res!.user?.token !== param.user.token) {
                    return sendState(socket, {
                        page: "login",
                        render: ["login"]
                    })
                } else {
                    return sendState(socket, res);
                }
            }
        })
    });

    server.listen({
        port: 3001,
        host: "0.0.0.0",
    }, () => {
        console.log("SERVER STARTED");
    });
})
