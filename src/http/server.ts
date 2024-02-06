import fastify from 'fastify';
import { z } from 'zod';
import { createPoll } from './routes/create-poll';
import { register } from 'module';

const app = fastify();

app.register(createPoll)

app.listen({port: 3333}).then(() => console.log('server running on port 3333'))