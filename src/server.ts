import express, { NextFunction, Request, Response } from "express";
import { v4 as uuid } from "uuid";

const app = express();
app.use(express.json());
const customers = [];

interface IRequest extends Request {
    customer: {
        cpf: string;
        name: string;
        id: string;
        statement: {
            description?: string;
            amount: number;
            created_at: Date;
            type: string;
        }[];
    };
}

function verifyIfExistsAccountCPF(
    request: IRequest,
    response: Response,
    _next: NextFunction
) {
    const { cpf } = request.headers;
    const customer = customers.find((customer) => customer.cpf === cpf);

    if (!customer) {
        return response.status(400).json({ error: "Customer not found" });
    }
    request.customer = customer;
    return _next();
}
function getBalance(statement) {
    const balance = statement.reduce((acc, operation) => {
        if (operation.type === "credit") {
            return acc + operation.amount;
        } else {
            return acc - operation.amount;
        }
    }, 0);
    return balance;
}

app.post(
    "/account",
    verifyIfExistsAccountCPF,
    (request: IRequest, response: Response) => {
        const { cpf, name } = request.body;

        customers.push({
            cpf,
            name,
            id: uuid(),
            statement: [],
        });

        return response.status(201).send();
    }
);
app.get(
    "/statement",
    verifyIfExistsAccountCPF,
    (request: IRequest, response: Response) => {
        const { customer } = request;
        return response.json(customer.statement);
    }
);
app.post(
    "/deposit",
    verifyIfExistsAccountCPF,
    (request: IRequest, response: Response) => {
        const { description, amount } = request.body;

        const { customer } = request;

        const statementOperation = {
            description,
            amount,
            created_at: new Date(),
            type: "credit",
        };

        customer.statement.push(statementOperation);

        return response.status(201).send();
    }
);
app.post(
    "/withdraw",
    verifyIfExistsAccountCPF,
    (request: IRequest, response: Response) => {
        const { amount } = request.body;
        const { customer } = request;

        const balance = getBalance(customer.statement);

        if (balance < amount) {
            return response.status(400).json({ error: "Insufficient funds" });
        }

        const statementOperation = {
            amount,
            created_at: new Date(),
            type: "debit",
        };

        customer.statement.push(statementOperation);

        return response.status(201).send();
    }
);

app.get(
    "/statement/date",
    verifyIfExistsAccountCPF,
    (request: IRequest, response: Response) => {
        const { customer } = request;
        const { date } = request.query;

        const dateFormat = new Date(date + " 00:00");

        const statement = customer.statement.filter(
            (statement) =>
                statement.created_at.toDateString() ===
                new Date(dateFormat).toDateString()
        );

        return response.json(statement);
    }
);

app.put(
    "/account",
    verifyIfExistsAccountCPF,
    (request: IRequest, response: Response) => {
        const { name } = request.body;
        const { customer } = request;

        customer.name = name;

        return response.status(201).send();
    }
);

app.get(
    "/account",
    verifyIfExistsAccountCPF,
    (request: IRequest, response: Response) => {
        const { customer } = request;

        return response.json(customer);
    }
);

app.delete(
    "/account",
    verifyIfExistsAccountCPF,
    (request: IRequest, response: Response) => {
        const { customer } = request;
        customers.splice(customer, 1); //remover apenas 1 elemento a partir do customer, ou seja, remover apenas ele

        return response.status(200).json(customers);
    }
);

app.get(
    "/balance",
    verifyIfExistsAccountCPF,
    (request: IRequest, response: Response) => {
        const { customer } = request;

        const balance = getBalance(customer.statement);

        return response.json(balance);
    }
);

app.listen(3000, () => console.log("Server running on port 3000!"));
