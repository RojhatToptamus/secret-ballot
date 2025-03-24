import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deploySecretBallot: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, get } = hre.deployments;

  // Get addresses of the already deployed verifier contracts
  const voteVerifierDeployment = await get("VoteUltraVerifier");
  const tallyVerifierDeployment = await get("TallyUltraVerifier");

  console.log("Deploying SecretBallot with:");
  console.log("Vote Verifier:", voteVerifierDeployment.address);
  console.log("Tally Verifier:", tallyVerifierDeployment.address);

  // Deploy the SecretBallot contract with constructor arguments
  const secretBallotDeployment = await deploy("SecretBallot", {
    from: deployer,
    args: [voteVerifierDeployment.address, tallyVerifierDeployment.address],
    log: true,
    autoMine: true,
  });

  console.log("SecretBallot deployed at:", secretBallotDeployment.address);
};

export default deploySecretBallot;
deploySecretBallot.tags = ["SecretBallot"];
