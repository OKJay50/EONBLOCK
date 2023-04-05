# Import required libraries
import hashlib
import json
from time import time

# Define the Blockchain class
class Blockchain:
    def __init__(self):
        self.chain = []
        self.current_transactions = []
        self.validators = []

        # Add the genesis block
        self.new_block(previous_hash='1', proof=100)

        # Add the data structure 
        self.transactions_map = {}

    def new_block(self, proof, previous_hash=None):
        block = {
            'index': len(self.chain) + 1,
            'timestamp': time(),
            'transactions': self.current_transactions,
            'proof': proof,
            'previous_hash': previous_hash or self.hash(self.chain[-1]),
        }
        
        # Reset current list of transactions
        self.current_transactions = []

        # Add the new block to the chain
        self.chain.append(block)

        # Add the transactions to the data structure
        for transaction in block['transactions']:
            if transaction['id'] not in self.transactions_map:
                self.transactions_map[transaction['id']] = transaction

        return block

    def new_transaction(self, sender, recipient, amount):
        self.current_transactions.append({
            'sender': sender,
            'recipient': recipient,
            'amount': amount,
            'id': hashlib.sha256(f'{sender}{recipient}{amount}{time()}'.encode()).hexdigest()
        })

        return self.last_block['index'] + 1

    @staticmethod
    def hash(block):
        # Hashes a block using SHA-256 algorithm
        block_string = json.dumps(block, sort_keys=True).encode()
        return hashlib.sha256(block_string).hexdigest()

    @property
    def last_block(self):
        return self.chain[-1]

    def add_validator(self, address):
        self.validators.append(address)

    def remove_validator(self, address):
        self.validators.remove(address)

    def valid_proof(self, last_proof, proof):
        guess = f'{last_proof}{proof}'.encode()
        guess_hash = hashlib.sha256(guess).hexdigest()
        return guess_hash[:4] == "0000"

    def valid_chain(self, chain):
        last_block = chain[0]
        current_index = 1

        while current_index < len(chain):
            block = chain[current_index]
            if block['previous_hash'] != self.hash(last_block):
                return False

            if not self.valid_proof(last_block['proof'], block['proof']):
                return False

            last_block = block
            current_index += 1

        return True

    def resolve_conflicts(self):
        # Replace our chain with the longest one on the network
        neighbors = self.nodes
        new_chain = None

        # We're only looking for chains longer than ours
        max_length = len(self.chain)

        # Grab and verify the chains from all the nodes in our network
        for node in neighbors:
            response = requests.get(f'http://{node}/chain_api')
            if response.status_code == 200:
                length = response.json()['length']
                chain = response.json()['chain']

                # Check if the length is longer and the chain is valid
                if length > max_length and self.valid_chain(chain):
                    max_length = length
                    new_chain = chain

        # Replace our chain if we discovered a new, valid chain that's longer than ours
        if new_chain:
            self.chain = new_chain

            # Add transactions to the data structure
            self.transactions_map = {}
            for block in self.chain:
                for transaction in block['transactions']:
                    if transaction['id'] not in self.transactions_map:
                        self.transactions_map[transaction['id']] = transaction

            return True

        return False

    def proof_of_authority(self, last_proof):
        # Simple proof-of-authority algorithm
        # Only the validators are allowed to mine new blocks
        # Not resistant to collusion attacks

        if not self.validators:
            return None
        
        for validator in self.validators:
            proof = 0
            while self.valid_proof(last_proof, proof) is False:
                proof += 1
            if self.valid_proof(last_proof, proof):
                return proof

        return None
