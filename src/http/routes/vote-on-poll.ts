import { randomUUID } from "node:crypto";
import { FastifyInstance } from "fastify";
import z from "zod";
import { prisma } from "../../lib/prisma";
import { redis } from "../../lib/redis";
import { voting } from "../../lib/voting-pub-sub";

export async function voteOnPoll(app: FastifyInstance) {
  app.post("/polls/:pollId/votes", async (request, reply) => {
    const voteOnPollBody = z.object({
      pollOptionId: z.string().uuid(),
    });

    const voteOnPollParams = z.object({
      pollId: z.string().uuid(),
    });

    const { pollOptionId } = voteOnPollBody.parse(request.body);
    const { pollId } = voteOnPollParams.parse(request.params);

    let sessionId = request.cookies.sessionId;

    if(sessionId) {
        const userPreviouslyVoteOnPoll = await prisma.vote.findUnique({
            where: {
                sessionId_pollId: { // verifica a restrição de voto do usuário numa mesma enquete
                    sessionId, pollId
                }
            }
        })
        if(userPreviouslyVoteOnPoll && userPreviouslyVoteOnPoll.pollOptionId != pollOptionId) {
            await prisma.vote.delete({
                where: {
                    id: userPreviouslyVoteOnPoll.id
                }
            })

           const votes = await redis.zincrby(pollId, -1, userPreviouslyVoteOnPoll.pollOptionId) // retira o voto anterior do ranking 
           voting.publish(pollId, {
            pollOptionId: userPreviouslyVoteOnPoll.pollOptionId,
            votes: Number(votes)
           })
        } else if (userPreviouslyVoteOnPoll) {
            return reply.status(400).send({ message: 'You already vote on this poll' })
        }
    }

    if (!sessionId) {
      sessionId = randomUUID();

      reply.setCookie("sessionId", sessionId, {
        path: "/", // Disponível em toda a aplicação
        maxAge: 60 * 60 * 24 * 30, // Duração
        signed: true, // Assinado
        httpOnly: true, // Acessível apenas pelo nosso backend
      });
    }

    await prisma.vote.create({ data: {
        sessionId, pollId, pollOptionId
    } })

    const votes = await redis.zincrby(pollId, 1,  pollOptionId) // Incrementa em 1, o param3(Propriedade) de dentro do param1(Tabela)

    voting.publish(pollId, {
      pollOptionId,
      votes: Number(votes)
    })

    return reply.status(201).send();
  });
}
