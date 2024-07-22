import { populateEnvironmentVariables } from "./helpers/parameter-store.helper";

export interface LambdaFunctionInterface {
  handler: (event: any, context: any, callback: any) => Promise<any>;
}

export class LambdaFunction implements LambdaFunctionInterface {
  public handler(event: any, context: any, callback: any) {
    // console.log("LambdaFunction handler called");
    return Promise.resolve(event);
  }
}

async function runLambdaFunction(event: any, context: any, callback: any) {
  // store the timestamp to calculate the duration
  const start = new Date().getTime();

  // parse the naming based on function name component
  const functionServiceName = process.env.SERVICE_NAME ?? `-`;
  const functionName = process.env.FUNCTION_NAME ?? `-`;

  await populateEnvironmentVariables();

  // await DynamoDBLibrary.instance();

  let errorResponse: any = undefined;
  const className =
    functionName
      .split(`-`)
      .map((x: string) => x.charAt(0).toUpperCase() + x.slice(1))
      .join(``) + "Function";
  const LambdaFunctionClass = require(`./functions/${functionName}.function`)[
    className
  ];
  const lambdaFunction = new LambdaFunctionClass();

  return lambdaFunction
    .handler(event, context, callback)
    .catch((error: any) => {
      errorResponse = error;
    })
    .finally(() => {
      console.info(`---------------------------------------------`);
      console.info(`lambda function name: ${functionName}`);
      console.info(`lambda function service name: ${functionServiceName}`);
      console.info(
        `lambda function duration: ${new Date().getTime() - start} ms`
      );
      console.info(
        `lambda function left time: ${context.getRemainingTimeInMillis()} ms`
      );
      console.info(`---------------------------------------------`);

      if (!errorResponse) return;
      // log the errror message to cloudwatch logs
      console.error(`Lambda ${functionName} execution error`, errorResponse);
      // throw the original error
      callback(null, {
        statusCode: 500,
        body: JSON.stringify({
          error: errorResponse.message,
        }),
      });
    });
}

export function handler(event: any, context: any, callback: any) {
  runLambdaFunction(event, context, callback).catch((e) => {
    console.error(`Lambda execution error`, e);
    return Promise.reject(e);
  });
}
