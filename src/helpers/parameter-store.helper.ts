import {
  GetParametersByPathCommand,
  Parameter,
  SSMClient,
} from "@aws-sdk/client-ssm";

const SSM_PREFIX = `/service/${process.env.SERVICE_DOMAIN}/${process.env.SERVICE_NAME}/${process.env.SERVICE_ENVIRONMENT}/`;
const SSM_CLIENT = new SSMClient({
  region: process.env.AWS_REGION || "ap-southeast-1",
});

export async function populateEnvironmentVariables(
  ssmPrefix?: string,
  environmentVariablePrefix?: string
) {
  if (environmentVariablePrefix) {
    environmentVariablePrefix = environmentVariablePrefix
      .toUpperCase()
      .replace(/[^a-zA-Z0-9]/g, "_");
  }

  const parameterList: Array<Parameter> = [];
  // get all parameter based on the prefix
  let nexToken: string | undefined;
  while (true) {
    const cmd = new GetParametersByPathCommand({
      Path: ssmPrefix ? ssmPrefix : SSM_PREFIX,
      WithDecryption: true,
      NextToken: nexToken,
    });
    const parameterListResponse = await SSM_CLIENT.send(cmd).catch((e) => {
      const errorMessage = `[ParameterStoreHelper][populateEnvironmentVariables] failed to get parameters from parameter store with path ${SSM_PREFIX}`;
      console.error(errorMessage, e);
      return null;
    });
    if (parameterListResponse?.Parameters) {
      parameterList.push(...parameterListResponse.Parameters);
    }
    if (!parameterListResponse?.NextToken) break;
    nexToken = parameterListResponse.NextToken;
  }

  // parse the parameters and set the environment variables
  for (const parameter of parameterList) {
    if (!parameter.Name) continue;
    // parse the name of the parameter
    // this will convert the parameter name to upper case and replace the '-' with '_'
    let key =
      (environmentVariablePrefix ? environmentVariablePrefix + "_" : "") +
      parameter.Name.replace(ssmPrefix ? ssmPrefix : SSM_PREFIX, "")
        .toUpperCase()
        .replace(/[^a-zA-Z0-9]/g, "_");
    if (key.startsWith(`_`)) key = key.substring(1); // 1 is mean the first index of the string
    // get the value of the parameter
    const value = parameter.Value;
    if (!value) continue;
    // set the environment variable
    const infoMessage = `[ParameterStoreHelper][populateEnvironmentVariables] setting environment variable ${key}`;
    console.info(infoMessage);
    process.env[key] = value;
  }

  // return all the env
  return process.env;
}
