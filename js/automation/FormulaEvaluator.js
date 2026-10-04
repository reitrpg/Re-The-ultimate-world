import BigNumber from "../number/BigNumber.js";

class FormulaEvaluator {
    constructor() {
        this.functions = new Map([
            ["floor", args => this.requireArgs("floor", args, 1, 1, value => {
                const number = this.toNumber(value);
                return Number.isFinite(number) ? BigNumber.from(Math.floor(number)) : BigNumber.zero();
            })],
            ["ceil", args => this.requireArgs("ceil", args, 1, 1, value => {
                const number = this.toNumber(value);
                return Number.isFinite(number) ? BigNumber.from(Math.ceil(number)) : BigNumber.zero();
            })],
            ["round", args => this.requireArgs("round", args, 1, 1, value => {
                const number = this.toNumber(value);
                return Number.isFinite(number) ? BigNumber.from(Math.round(number)) : BigNumber.zero();
            })],
            ["abs", args => this.requireArgs("abs", args, 1, 1, value => {
                const number = this.toNumber(value);
                return Number.isFinite(number) ? BigNumber.from(Math.abs(number)) : BigNumber.zero();
            })],
            ["sqrt", args => this.requireArgs("sqrt", args, 1, 1, value => {
                const number = this.toNumber(value);
                return Number.isFinite(number) && number >= 0 ? BigNumber.from(Math.sqrt(number)) : BigNumber.zero();
            })],
            ["log", args => this.requireArgs("log", args, 1, 1, value => {
                const number = this.toNumber(value);
                return Number.isFinite(number) && number > 0 ? BigNumber.from(Math.log(number)) : BigNumber.zero();
            })],
            ["log10", args => this.requireArgs("log10", args, 1, 1, value => {
                const number = this.toNumber(value);
                return Number.isFinite(number) && number > 0 ? BigNumber.from(Math.log10(number)) : BigNumber.zero();
            })],
            ["pow", args => {
                if (args.length !== 2) throw new Error("pow は2個の引数が必要です");
                const base = this.toNumber(args[0]);
                const exponent = this.toNumber(args[1]);
                if (!Number.isFinite(base) || !Number.isFinite(exponent)) return BigNumber.zero();
                const result = Math.pow(base, exponent);
                return Number.isFinite(result) ? BigNumber.from(result) : BigNumber.zero();
            }],
            ["min", args => this.minMax(args, false)],
            ["max", args => this.minMax(args, true)]
        ]);
    }

    requireArgs(name, args, min, max, callback) {
        if (args.length < min || args.length > max) {
            throw new Error(name + " の引数が不正です");
        }
        return callback(args[0]);
    }

    minMax(args, maximum) {
        if (args.length < 1) throw new Error("min/max には引数が必要です");
        return args.reduce((best, value) => {
            const comparison = value.compare(best);
            return maximum
                ? (comparison > 0 ? value : best)
                : (comparison < 0 ? value : best);
        });
    }

    toNumber(value) {
        const number = BigNumber.from(value).toNumber();
        if (!Number.isFinite(number)) {
            throw new Error("この関数では値が大きすぎます");
        }
        return number;
    }

    tokenize(expression) {
        const tokens = [];
        let i = 0;

        while (i < expression.length) {
            const char = expression[i];

            if (/\s/.test(char)) {
                i++;
                continue;
            }

            if (/[0-9.]/.test(char)) {
                const start = i;
                let dots = 0;
                while (i < expression.length && /[0-9.]/.test(expression[i])) {
                    if (expression[i] === ".") dots++;
                    i++;
                }
                const raw = expression.slice(start, i);
                if (dots > 1 || !Number.isFinite(Number(raw))) {
                    throw new Error("数値の形式が不正です");
                }
                tokens.push({ type: "number", value: BigNumber.from(Number(raw)) });
                continue;
            }

            if (/[A-Za-z_]/.test(char)) {
                const start = i;
                i++;
                while (i < expression.length && /[A-Za-z0-9_]/.test(expression[i])) i++;
                tokens.push({ type: "identifier", value: expression.slice(start, i) });
                continue;
            }

            if ("+-*/%^(),".includes(char)) {
                tokens.push({ type: char, value: char });
                i++;
                continue;
            }

            throw new Error("使用できない文字です: " + char);
        }

        tokens.push({ type: "eof", value: null });
        return tokens;
    }

    evaluate(expression, variables = {}) {
        if (typeof expression !== "string" || !expression.trim()) {
            throw new Error("計算式が空です");
        }

        const tokens = this.tokenize(expression);
        let position = 0;

        const peek = () => tokens[position];
        const consume = type => {
            if (peek().type !== type) {
                throw new Error("計算式の構文が不正です");
            }
            return tokens[position++];
        };

        const parseExpression = () => parseAdditive();

        const parseAdditive = () => {
            let value = parseMultiplicative();
            while (peek().type === "+" || peek().type === "-") {
                const operator = consume(peek().type).type;
                const right = parseMultiplicative();
                value = operator === "+" ? value.add(right) : value.subtract(right);
            }
            return value;
        };

        const parseMultiplicative = () => {
            let value = parsePower();
            while (peek().type === "*" || peek().type === "/" || peek().type === "%") {
                const operator = consume(peek().type).type;
                const right = parsePower();

                if (operator === "*") value = value.multiply(right);
                else if (operator === "/") value = value.divide(right);
                else {
                    const leftNumber = value.toNumber();
                    const rightNumber = right.toNumber();
                    if (!Number.isFinite(leftNumber) || !Number.isFinite(rightNumber) || rightNumber === 0) {
                        throw new Error("剰余計算ができません");
                    }
                    value = BigNumber.from(leftNumber % rightNumber);
                }
            }
            return value;
        };

        const parsePower = () => {
            let value = parseUnary();
            if (peek().type === "^") {
                consume("^");
                const right = parsePower();
                const base = value.toNumber();
                const exponent = right.toNumber();
                const result = Math.pow(base, exponent);
                if (!Number.isFinite(base) || !Number.isFinite(exponent) || !Number.isFinite(result)) {
                    throw new Error("べき乗の結果が大きすぎます");
                }
                value = BigNumber.from(result);
            }
            return value;
        };

        const parseUnary = () => {
            if (peek().type === "+") {
                consume("+");
                return parseUnary();
            }
            if (peek().type === "-") {
                consume("-");
                return BigNumber.zero().subtract(parseUnary());
            }
            return parsePrimary();
        };

        const parsePrimary = () => {
            if (peek().type === "number") {
                return consume("number").value;
            }

            if (peek().type === "(") {
                consume("(");
                const value = parseExpression();
                consume(")");
                return value;
            }

            if (peek().type === "identifier") {
                const name = consume("identifier").value;
                if (peek().type === "(") {
                    consume("(");
                    const args = [];
                    if (peek().type !== ")") {
                        args.push(parseExpression());
                        while (peek().type === ",") {
                            consume(",");
                            args.push(parseExpression());
                        }
                    }
                    consume(")");

                    const fn = this.functions.get(name.toLowerCase());
                    if (!fn) throw new Error("未定義の特殊関数です: " + name);
                    return fn(args);
                }

                const variable = variables[name];
                if (variable === undefined) {
                    throw new Error("未定義の変数です: " + name);
                }
                return BigNumber.from(variable);
            }

            throw new Error("値が必要です");
        };

        const result = parseExpression();
        if (peek().type !== "eof") {
            throw new Error("計算式の末尾が不正です");
        }
        return result;
    }
}

export default new FormulaEvaluator();
