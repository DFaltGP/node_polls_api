import fastify from 'fastify';
import cookie from '@fastify/cookie';
import websocket from '@fastify/websocket';
import { createPoll } from './routes/create-poll';
import { getPoll } from './routes/get-poll';
import { voteOnPoll } from './routes/vote-on-poll';
import { pollResults } from './ws/poll-result';

// Calling Fastify
const app = fastify();

// Functionalities
app.register(cookie, {
    secret: "polls-secret-nlw",
    hook: "onRequest",
})

app.register(websocket)

// Routes
app.register(createPoll)
app.register(getPoll)
app.register(voteOnPoll)
app.register(pollResults)

// starting the server on port: XXXX
app.listen({port: 3333}).then(() => console.log('server running on port 3333'))