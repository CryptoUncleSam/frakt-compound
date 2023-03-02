import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import * as web3 from '@solana/web3.js'
import { FC , useState} from 'react'
import styles from '../styles/PingButton.module.css'
import { loans } from '@frakt-protocol/frakt-sdk';
import moment from 'moment/moment.js';

export const PingButton: FC = () => {
	const { connection } = useConnection();
	const { publicKey, sendTransaction } = useWallet();
	const [selectedOption, setSelectedOption] = useState("");

	const handleOptionSelect = (event) => {
		setSelectedOption(event.target.value);
	};

	const onClick = async () => {

		if (!connection || !publicKey) { return }
		const NFT_LENDING_V2 = new web3.PublicKey('A66HabVL3DzNzeJgcHYtRRNW1ZRMKwBfrdSR4kLsZ9DJ')
		const ADMIN = new web3.PublicKey('9aTtUqAnuSMndCpjcPosRNf3fCkrTQAV8C8GERf3tZi3')
		const SECONDS_IN_YEAR = 60*60*24*365

		// GETTING LIQUIDITY POOLS
        const pa = await loans.getAllProgramAccounts(NFT_LENDING_V2, connection)
        const allPools = pa.priceBasedLiquidityPools
        const allDeposit = pa.deposits
        const flipPool = pa.timeBasedLiquidityPools[0]
		
		// FILTERING USER DEPOSIT LIQUIDITY POOLS
        let depositedPools = []
        for(const deposit of allDeposit){
            if(deposit.user==publicKey.toBase58() && deposit.amount!=0){
                depositedPools.push(deposit)
            }
        }

		// CALCULATING HARVEST AMOUNT
        for(const pool of allPools){
            for(const myPool of depositedPools){
                // PRICE BASED POOLS
                if(pool.liquidityPoolPubkey==myPool.liquidityPool){
                    const diffTime = Math.floor(moment.utc().unix()) - pool.lastTime;
                    const depositCumulative = pool.depositApr * diffTime + pool.depositCumulative;
                    const kf = (1e4 - pool.depositCommission) / 1e4;
                    const harvestAmount = (((depositCumulative - myPool.stakedAtCumulative) * myPool.amount) / SECONDS_IN_YEAR / 1e4) * kf;
                    myPool['harvestAmount'] = harvestAmount;
                }
                // FLIP POOL
                if(myPool.liquidityPool=='FuydvCEeh5sa4YyPzQuoJFBRJ4sF5mwT4rbeaWMi3nuN'){
                    const diffTime = Math.floor(moment.utc().unix()) - flipPool.lastTime;
                    const depositCumulative = flipPool.apr * diffTime + flipPool.cumulative;
                    const harvestAmount = ((depositCumulative - myPool.stakedAtCumulative) * myPool.amount) / 1e11;
                    myPool['harvestAmount'] = harvestAmount;
                }
            }
        }

		// HARVESTING POOLS
        let amountToCompund = 0
        let instructions = []
        for(const poolToHarvest of depositedPools){
            try{
                if(poolToHarvest.harvestAmount>=0.001*web3.LAMPORTS_PER_SOL){
                    amountToCompund+=poolToHarvest.harvestAmount
                    const tx = await loans.harvestLiquidity({
                        programId: NFT_LENDING_V2,
                        connection: connection,
                        liquidityPool: new web3.PublicKey(poolToHarvest.liquidityPool),
                        user: publicKey,
                        adminPubkey: ADMIN
                    })
                    instructions.push(tx.ix)
                }
            }catch(err){}  
        }

		// DEPOSITING COMPOUND AMOUNT IN POOL
        if(selectedOption!=""){
            amountToCompund = amountToCompund * (1-0.001)
            if(amountToCompund!=0){
                const depositTx = await loans.depositLiquidity({
                    programId: NFT_LENDING_V2,
                    liquidityPool: new web3.PublicKey(selectedOption),
                    connection: connection,
                    user: publicKey,
                    amount: amountToCompund
                })
                instructions.push(depositTx.ix)
            }
        }
		

		//APP FEE
		const FEE = 0.001
		const feeAmount = amountToCompund*FEE
		const feeTx = web3.SystemProgram.transfer({
			fromPubkey: publicKey,
			toPubkey: new web3.PublicKey('tioEGUcmaUSRJwGkddEYZHuhnUG47uirBmds6aELE1x'),
			lamports: feeAmount*web3.LAMPORTS_PER_SOL
		})
		instructions.push(feeTx)

		// CREATE-SIGN-SEND TX
		const transaction = new web3.Transaction()

		for(const ix of instructions){
            transaction.add(ix);
        }
		

        sendTransaction(transaction, connection).then(sig => {
            console.log(sig)
        })

	}

	return (
		<div>
			<div>
				<select value={selectedOption} onChange={handleOptionSelect}>
                <option value="">None</option>
                <option value="FuydvCEeh5sa4YyPzQuoJFBRJ4sF5mwT4rbeaWMi3nuN">Flip loans</option>
                <option value="9pLs7CmeY2CyJ4iUYnMAYXJLrRpMMa2qa11hnTF9wtGY">Boryoku Dragonz</option>
                <option value="E5ih5iq2NbZxN7YvXnksGVU2MeNEUbeo6D9xTe3jguie">Aurory</option>
                <option value="GiSN4MKqh9T36ZxrDTQjwyjr3Rc7M1UKqnRTwwLGPaCA">Portals</option>
                <option value="7ysKkncWYZEF4VjVTxUfwqER8HDt7ztoU2uyEQ3TBUxP">Okay Bears</option>
                <option value="DFabaBps2xnCETFFt7CTxWJ8ujoqLzMWtjA4HDYgDbCc">Shadowy Super Coder</option>
                <option value="WBVYLMWezRqtCS76rX5G86wJmFwpGZN9aRVokrCFUqS">Blocksmith Labs</option>
                <option value="G7sfrkdYoRDjEAB2AAR9SKh2pXzP3to2kEeP32SxxvBB">Stoned Ape Crew</option>
                <option value="Gjogm7jJtjVgVVQUpyquDivaJ7HTsx3SrS3G6qnyNca9">Degenerate Ape Academy</option>
                <option value="BLwYjZkmzm7qg2ppA7Nane38QLKFUK6RgTd9PJ4fogzh">Astrals</option>
                <option value="HipjLy1v6kEzR5Fk1enfAgCBNnKSeStfr59yLbf9WbvQ">Famous Fox Federation</option>
                <option value="14VApMWQPHxFKw4ai14pqeGJ3VaV63eRG14ZMbU5h3vr">Lifinity Flares</option>
                <option value="GjK7uwqUZSfkzsnrr3sAx4e9VSc5qTs6haniAcmF6oWN">Solana Monkey Business</option>
                <option value="7u7jPeHFtru67vSCGiKUxjvfgUr2CBb7u4KJ3enjfurh">Cets On Creck</option>
                <option value="BHDWF3t14p6mfgNvqRW1CpTLfuYPH8daRkPJdKddt6VF">Taiyo Robotics</option>
                <option value="3UjNTqxPquKNkfAscFk3AxW2pBEKcQYfjymBrUzbeq3r">Pesky Penguins</option>
                <option value="A2HpPLHLuYfHoJd4Y68JT6No7RKG3mzW8ei68sMKHrMC">DeGods</option>
                <option value="BUP3uuXo2pCVVTbj18FEmcWcohA3bAoKdnWAjmDnvf7B">Degen Fat Cats</option>
                <option value="J1gkskYNhszxbBWBuAi1kGjG18XGaAD3x14VciTfG8Z">Turtles</option>
                <option value="694C2SbXoMTNM66V67fsB4AfVYcws4KLMjewEPF988Bf">ABC</option>
                <option value="6XqJFA5maRF5RjCVBioLQc9WNYW842VVP5o75RdWYR3F">Galactic Geckos</option>
                <option value="Q9prABihPQ4HvTcDLdbp3F71rjzA2scdZiJZERaaTt6">Thugbirdz</option>
                <option value="6KVDKL3yjKZYsegGbVzhakTbdZt5y4fooRysk9TMuN7j">The Catalina Whale Mixer</option>
                <option value="FuUCpqKfb59SzeAu2HEzBkpmfpU7q2BBHw8iQs1uS1nz">OG Atadians</option>
                <option value="2TnTSzfNxNCswovQG2MKTJZbAGxA3j1gUUs4ZLkmscxd">Just Ape</option>
                <option value="7tw6zKTLkwCubKonfLKkK8wwKn4ZzCAy42GpRRknHvQM">Primates</option>
                <option value="3Lgz3A3dB4KS4DK46hBAmLZCDpdwfkC5gXvykADXmjUH">Trippin Apes</option>
                <option value="2hdg3iYYz4ZkyhUVQU4uzQybiCEfkQ6kYvMuGmtXUYg2">Communi3: Mad Scientists</option>
                <option value="4LomurP5Q9jD913VBXCyLMHsrufcopRiTS7ZMc3G3ACY">Pawnshop Gnomies</option>
                <option value="EMmffhjjqv2RcybvoHTruNc27pqV7D14t4cMq9G5DeXj">Forest Apes</option>
                <option value="51UMibEqBngMLh4EjdnGBaLx4rowo44C9yg7upDZztEp">Dronies</option>
                <option value="5vPpSsCEdG2Gm3zVq4yUzHDnryTf1ZwfeBsLNBAZmwsL">Geomancer</option>
                <option value="GP1Hs6qpDyEEZTBvueAcrZdv7w7myNJdjrJWggWmVGjg">RadRugs</option>
                <option value="FUoTswwqm2Entsmsxn9ZFqxi7DdzF5v7PZ5dxAUdfPLu">Fearless Bulls Club</option>
                <option value="CafEsF7dQ6CQvSLzxjXJ5P8yurtwzEKY8vcDxnzM84eN">Ghost Kid DAO</option>
                <option value="DyNm6iJu8FKT5jNgtVzz87ucHY8JuKd2n6M9VPkHRDkn">y00ts</option>
                <option value="5LVkvP9Bi6C4SMAh3RF3ruso4cSuxCtGYvJ1CdNgzrx3">Jungle Cats</option>
                <option value="BgGxx3QzxEq9rrKyH7gKJX5V1KxLqCt6YkUTBphH2gyC">Cyber Samurai</option>
                <option value="63do5KwXSGSyLUC7pQYEvfw8KWStv1uS3vDSTd8L1osW">Doge Capital</option>
                <option value="4SumCNhHeaPYHXcfxzBNpRVWavwuUuNRQuspTmSWYFt7">ChillChat</option>
                <option value="EKiVbY9oFRAQX9Gkm34MxPF1mawuQzxWZ3pRgTYe1WYH">Jungle Cats Lioness</option>
                <option value="F8mUCvQZnz4BmdSqKqX4TNkXA8THPxCnJn4aSKRNjzum">Good Vibrations</option>
                <option value="CCsEPscMKgC29uM1WgLN5yMH92s9p5Qf4V5CQChHYVAo">Cyberlinx</option>
                <option value="3Y2LWzGrntqVYkATCBYohEh9qdiGeQyAKivNNfb9K5bp">Claynosaurz</option>
                <option value="3pUhQy5PGmFcFLZTDECFtaV7t6gVPMj2Qqqs6diD9qxg">Remnant Camp</option>
                <option value="5Efq3p8Bq37pKbNvsUWf3Di3UZgU5ZQ4EvowgFKTerdU">LILY</option>
                <option value="DTzL5v81xZaycNT9GnM5nqmeCHGuEAUQYGJVXYdwonde">Lotus Gang</option>
                <option value="6cVE2BzxGN786V6vXGRaCFF1C8oomPR1pRdxJdRT2it9">Degenerate Trash Pandas</option>
                <option value="8BwFLWu3dksseecpDyz5z4bEZvAbJLPNFetunKLjjdR3">Helions</option>
                <option value="gRcsEtfJU9KDycMsJoPudvnJdwHZLuCZS8KuwPQLQ9B">Ovols</option>
                <option value="12kG3nQHrp9hozgBS2PYAKdo5SMtJRELfKYjjwvwrbhX">Pilots</option>
                <option value="CZhSYZKLJjJ9JBtMULuHQ7YSMfv6w3ooRiAtn7UNuLNg">DUELBOTS</option>
                <option value="2icZFybPe4UPuwUnESEZHmbe5SfwAdCcG6XjZUMuZb6M">Netrunner</option>
                <option value="ByYgw72CkSVPUV99BrNmggJnGdwkVh8YNEdP21mW6t3t">Gods</option>
                <option value="RnTCN26p4agfo35fAmfRgmPGSQemkh5qDdRmAChifKM">BONKz</option>
                <option value="Dw9Nm2fSpVm9CfSrG18SUAcNpy91eynC63wFR5rs1EH8">Lunar Project</option>
				</select>
			</div>
			<div className={styles.buttonContainer} onClick={onClick}>
				<button className={styles.button}>COMPOUND</button>
			</div>
		</div>
	)
}