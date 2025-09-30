Small Guide!

# Aptos Fullnode REST API Overview

The **Aptos Fullnode REST API** is the low-level HTTP interface available on every fullnode under the `/v1` path.  
It is the **primary tool** for:
- Reading the current chain state (real-time).
- Submitting transactions.
- Simulating operations.

For **complex historical, aggregated, or relational queries** (e.g., scanning all NFTs owned by a user, analytics, or iterating over tables), use the **Aptos Indexer GraphQL API** instead.

---

##  Capabilities of the Fullnode REST API

### 1. Accounts and State
- **Account Metadata**
  - `GET /v1/accounts/{address}` → Sequence number (nonce), authentication key.
- **All Resources**
  - `GET /v1/accounts/{address}/resources` → Lists all Move resources under the account (e.g., balances, NFTs).
- **Specific Resource**
  - `GET /v1/accounts/{address}/resource/{type}` → Fetches a single Move resource by type.
- **Outbound Transactions**
  - `GET /v1/accounts/{address}/transactions` → Lists committed transactions sent from the account.

---

### 2. Smart Contracts (Modules and State)
- **Deployed Modules**
  - `GET /v1/accounts/{address}/modules` → Lists all modules (bytecode + ABI).
- **Single Module**
  - `GET /v1/accounts/{address}/module/{name}` → Retrieves bytecode + ABI of a single module.
- **View Functions**
  - `POST /v1/view` → Executes a read-only Move function without gas.
- **Table Access**
  - `POST /v1/tables/{handle}/item` → Reads a typed entry from a Move Table.
  - `POST /v1/tables/{handle}/raw_item` → Reads a raw BCS entry.

---

### 3. Transactions and Events
- **Transaction Simulation**
  - `POST /v1/transactions/simulate` → Dry-run a transaction, get gas usage + events.
- **Gas Price**
  - `GET /v1/estimate_gas_price` → Current gas price estimates.
- **Committed Transactions**
  - `GET /v1/transactions` → Paginated global feed of transactions.
- **Transaction Lookup**
  - `GET /v1/transactions/by_hash/{hash}` → Lookup by hash.  
  - `GET /v1/transactions/by_version/{version}` → Lookup by ledger version.
- **Events**
  - `GET /v1/accounts/{address}/events/{creation_number}` → Events by creation number.  
  - `GET /v1/accounts/{address}/events/{event_handle}/{field_name}` → Events by event handle.

---

### 4. Blocks and Ledger Info
- **Blocks**
  - `GET /v1/blocks/by_height/{height}` → Block by height (with optional transactions).  
  - `GET /v1/blocks/by_version/{version}` → Block containing a specific version.
- **Ledger Info**
  - `GET /v1/` → General network metadata (chain ID, ledger version, block height, etc.).  
  - `GET /v1/healthy` → Node health check.

---

## ⏳ Historical Data
- Most read endpoints accept `?ledger_version=` to fetch state at a specific past version.  
- If data is **pruned**, the API will return `410 Gone`.  
- For **deep history** or **aggregations**, use:
  - Archive Nodes
  - Aptos Indexer GraphQL API

---

##  Limitations of the Fullnode REST API
- Cannot iterate over Move Tables (must know the key).  
- Cannot efficiently scan NFTs, inbound transfers, or perform analytics.  
- Pruned historical data is unavailable.  
- Returns raw Move structures, not relational models.

---

## When to Use What
- **Fullnode REST API** → Real-time reads, transaction submission, simulations, specific resource lookups.  
- **Indexer GraphQL API** → Complex queries, scanning, aggregation, analytics, deep history.




---

The **Aptos Fullnode REST API** is the low-level HTTP interface embedded in every Aptos fullnode under the `/v1` path. It is designed as a direct, low-latency conduit to the blockchain's state and is the primary tool for reading the current chain state, submitting transactions, and simulating operations.

For complex historical, aggregated, or relational queries (like scanning all NFTs owned by a user or performing analytics), the sources recommend using the **Aptos Indexer GraphQL API** instead of the Fullnode REST API.

The data retrieval capabilities of the Fullnode API are categorized below, focusing specifically on accounts, contracts, and other related ledger data.

---

## Data Retrieval for Accounts and State

The API provides comprehensive endpoints for inspecting the data and state associated with any account address.

### 1. Basic Account Information (Metadata)
| Endpoint | Purpose | Retrieved Data |
| :--- | :--- | :--- |
| **`GET /v1/accounts/{address}`** | Retrieves the most fundamental properties of an on-chain account. | **Sequence Number**: An integer acting as a nonce, mandatory for constructing a new transaction. **Authentication Key**: Used by the blockchain to verify transaction signatures, derived from the account’s public key (supports key rotation). |

### 2. Move Resources (Account State and Balances)
In Aptos, data is organized into **Move Resources** (custom data structures) stored directly under a user's account.

| Endpoint | Purpose | Retrieved Data |
| :--- | :--- | :--- |
| **`GET /v1/accounts/{address}/resources`** | Returns an array of **all Move resources** stored under the account. | Each resource is returned as a JSON object containing its `type` and `data` (fields and values of the struct). This includes **token balances**, such as the APT balance, which is read from the `CoinStore<0x1::aptos_coin::AptosCoin>` resource. |
| **`GET /v1/accounts/{address}/resource/{type}`** | Fetches a **single specific resource** by its full Move type string. | Provides the type and data for a specific resource, which is more efficient for direct reads (e.g., getting a custom `MyModule::MyResource<...>` or a CoinStore balance). |

### 3. Account Transaction History
| Endpoint | Purpose | Retrieved Data |
| :--- | :--- | :--- |
| **`GET /v1/accounts/{address}/transactions`** | Lists committed transactions **sent from** the specified account. | Returns a paginated list of transaction objects, useful for reconstructing an account's outbound activity history. (Note: Discovering inbound transfers typically requires scanning events or using the Indexer.) |

---

## Data Retrieval for Smart Contracts and Contracts

Smart contracts in Aptos are called **Move Modules**, and their associated data (state) is primarily stored in resources or tables.

### 1. Contract Code (Modules)
| Endpoint | Purpose | Retrieved Data |
| :--- | :--- | :--- |
| **`GET /v1/accounts/{address}/modules`** | Retrieves an array of all Move modules deployed under a specific account. | **Compiled Bytecode**: The execution code (hex string) for the smart contract. **ABI (Application Binary Interface)**: A JSON object detailing the public interface, including functions, parameters, and struct layouts. |
| **`GET /v1/accounts/{address}/module/{name}`** | Fetches a **single specific module** by name. | Returns the bytecode and ABI for the single requested module. |

### 2. Contract State (Tables)
For contracts that use large, keyed data stores, the API offers endpoints to read from Move `Table` structures.

| Endpoint | Purpose | Retrieved Data |
| :--- | :--- | :--- |
| **`POST /v1/tables/{handle}/item`** | Reads a **typed entry** from a Move `Table`. | Requires specifying the `table_handle`, `key_type`, `value_type`, and the `key` in the request body, returning the decoded value. |
| **`POST /v1/tables/{handle}/raw_item`** | Reads a raw BCS entry by providing a serialized key. | Returns the raw BCS value for efficiency. |
| **Limitation** | You **cannot iterate a table or enumerate all keys** using the Fullnode API; the Indexer should be used for this purpose. | N/A |

### 3. Read-Only Contract Execution (View Functions)
The `/view` endpoint allows execution of Move functions marked as `view` (read-only) directly against the current ledger state without submitting a transaction or paying gas.

| Endpoint | Purpose | Retrieved Data |
| :--- | :--- | :--- |
| **`POST /v1/view`** | Executes read-only contract logic. | Returns the **decoded JSON results** of the function's return type(s). This is useful for complex queries that require on-chain computation, such as checking a token balance (`0x1::coin::balance`) or getting calculated metrics like a highest bid. |

---

## Other Retrievable Ledger Data ("Etc.")

The Fullnode API provides endpoints to retrieve data concerning transactions, events, blocks, and general network health.

### 1. Transactions
The API allows both submitting new transactions and retrieving details about existing ones.

| Endpoint | Purpose | Retrieved Data |
| :--- | :--- | :--- |
| **`GET /v1/transactions`** | Retrieves a global feed of committed transactions (paginated). | List of transaction objects containing execution details. |
| **`GET /v1/transactions/by_hash/{hash}`** | Fetches a specific transaction by its unique hash. | Full transaction details, including payload, success status, `vm_status`, `gas_used`, and emitted **events**. |
| **`GET /v1/transactions/by_version/{version}`** | Fetches a specific transaction by its unique ledger version. | Full transaction details. |
| **`POST /v1/transactions/simulate`** | Performs a dry-run of a transaction without commitment. | Returns the VM status (success/failure), **gas usage estimation**, and the **events** that would be emitted. |

### 2. Events
Events are informational messages emitted by smart contracts during transaction execution.

| Endpoint | Purpose | Retrieved Data |
| :--- | :--- | :--- |
| **`GET /v1/accounts/{address}/events/{creation_number}`** | Retrieves events by the stream's creation number (monotonically increasing). | A list of event objects associated with that specific stream. |
| **`GET /v1/accounts/{address}/events/{event_handle}/{field_name}`** | Retrieves events using the event handle field (e.g., `withdraw_events` on `CoinStore`). | Returns events emitted to that specific handle. |

### 3. Blocks
Blocks contain batches of transactions.

| Endpoint | Purpose | Retrieved Data |
| :--- | :--- | :--- |
| **`GET /v1/blocks/by_height/{height}`** | Retrieves block metadata by its sequential height. | Block metadata (height, hash, timestamp, first/last version). Optionally includes all **transactions** if `?with_transactions=true` is used. |
| **`GET /v1/blocks/by_version/{version}`** | Retrieves the block containing the specified transaction version. | Block metadata and optional transactions. |

### 4. General Network and Ledger Information
| Endpoint | Purpose | Retrieved Data |
| :--- | :--- | :--- |
| **`GET /v1/` (Root)** | Retrieves basic node and ledger information. | **Chain ID**, current **ledger version**, current **block height**, epoch, and node role. |
| **`GET /v1/healthy`** | Performs a basic health check for monitoring. | Returns HTTP 200 OK if the node is operating and fetching the latest ledger info. |
| **`GET /v1/estimate_gas_price`** | Returns the current estimated gas price. | Current gas price estimates. |

### Historical Data Retrieval
Many read endpoints (accounts, resources, blocks, transactions) accept a query parameter `?ledger_version=` to retrieve the state or data **as it existed at a specific point in history**. If a historical version has been **pruned** (removed for storage management), the API will return a **410 Gone** error.


That is an insightful question. Given the breadth of the Aptos Fullnode REST API and its surrounding architecture detailed in the sources, the previous response covered the API comprehensively, but it is necessary to clarify the **limitations** of the Fullnode REST API and explain **when you should use the Indexer API instead**, as this context ensures a complete understanding of data retrieval on Aptos.

The sources provide a comprehensive overview of the **Fullnode REST API**, its capabilities, and its limitations.

Here is a summary addressing what is included (the "all") and what is specifically *not* included or efficiently retrieved by the Fullnode API (the limitations):

## 1. What the Fullnode REST API **Can** Retrieve (The "All")

The Aptos Fullnode REST API is the **low-level, low-latency** source of truth for the current state of the blockchain. It is ideal for **real-time reads** and submitting transactions.

| Category | Retrieved Data | Endpoints/Mechanism |
| :--- | :--- | :--- |
| **Account Metadata** | Sequence number and authentication key. | `GET /v1/accounts/{address}`. |
| **Account State (Resources)** | **All Move resources** (including coin balances, NFT holdings, and custom contract state) stored under an account address. | `GET /v1/accounts/{address}/resources`. |
| **Specific State** | A **single specific Move resource** by its full type string (e.g., `CoinStore<AptosCoin>`). | `GET /v1/accounts/{address}/resource/{type}`. |
| **Contract Code** | Compiled **Move bytecode** and **ABI** (Application Binary Interface) for all or specific modules deployed under an account. | `GET /v1/accounts/{address}/modules` or `/module/{name}`. |
| **Contract State (Tables)**| A **specific item** from a Move `Table` structure, provided the `table_handle` and the `key` are known. | `POST /v1/tables/{handle}/item` or `/raw_item`. |
| **Complex State Reads** | Results of executing a **read-only Move `view` function** (no gas costs). | `POST /v1/view`. |
| **Historical Data** | The state of any of the above resources/modules at a specific past transaction version, using the `ledger_version` parameter. | Query parameter `?ledger_version=`. |
| **Transaction Info** | Details of committed transactions (by hash, version, or listing recent ones). | `GET /v1/transactions/by_hash/{hash}`, `/by_version/{version}`. |
| **Simulation** | The result, gas usage, and events from a dry-run transaction, without commitment or cost. | `POST /v1/transactions/simulate`. |
| **Events** | Event streams associated with an account by `creation_number` or by `event_handle`/`field_name`. | `GET /v1/accounts/{address}/events/{creation_number}`. |

---

## 2. What the Fullnode REST API **Cannot** Efficiently Retrieve (The Limitations)

While the Fullnode API provides deep access to ledger state, it is specifically **not designed** for complex querying, aggregation, or iteration. For these use cases, the Indexer API is required.

| Limitation | Explanation | Recommended Alternative |
| :--- | :--- | :--- |
| **Table Iteration/Key Listing** | You **cannot iterate a Move Table** or enumerate all keys stored within a contract's table data structure using the Fullnode REST API. You must know the key in advance. | **Indexer GraphQL API**. |
| **Historical Aggregation/Scanning** | Complex queries like "scan all NFTs owned by user X," "find all historical transfers of token Y," or displaying marketplace listings require querying across multiple entities and filtering, which is inefficient via the Fullnode. | **Indexer GraphQL API**. |
| **Inbound Transaction Discovery** | The endpoint `GET /v1/accounts/{address}/transactions` only lists transactions **sent from** that account. To reliably discover inbound transfers or activity initiated by others, you must scan for `deposit_events` or use a pre-indexed history. | **Indexer GraphQL API** or scanning **Event streams**. |
| **Deep History Access** | Fullnodes typically **prune** old transactions, state versions, and events to save storage space. Querying pruned data returns a **410 Gone** error. | **Archive Nodes** (specialized Fullnodes that retain all data) or the **Indexer GraphQL API**. |
| **Relational Queries** | The Fullnode API returns raw Move data structures (`{type, data}`). It lacks the high-level, relational models (e.g., token metadata mapped to owners) provided by a structured database. | **Indexer GraphQL API**. |


Indeed, based on the sources, the information provided now is **complete and comprehensive**, covering both the capabilities and the critical architectural context (when to use the Fullnode API versus the Indexer API).

The Aptos Fullnode REST API is the **primary, low-level interface** embedded in every fullnode under the `/v1` path. It is designed for **real-time state reads** and transaction submission.

Here is a consolidated overview of the data you can retrieve using the Fullnode API, categorized by entity (Accounts, Contracts/Modules, and General Ledger Data):

## I. Accounts and Resources Data Retrieval

Accounts in Aptos are 32-byte hex addresses that store resources and modules. The API provides the following endpoints for fetching account state and metadata:

| Data Type | Endpoint | Purpose and Retrieved Data | Sources |
| :--- | :--- | :--- | :--- |
| **Core Account Info** | `GET /v1/accounts/{address}` | Retrieves the **sequence number** (nonce, critical for transaction building) and the **authentication key** (used for signature verification). | |
| **All Move Resources** | `GET /v1/accounts/{address}/resources` | Returns an array of **all Move resources** stored under the account. This includes **coin balances** (e.g., APT balance is found in the `CoinStore` resource) and **NFT holdings** (Digital Assets). | |
| **Specific Resource** | `GET /v1/accounts/{address}/resource/{type}` | Fetches a **single resource** directly by its full Move type string (e.g., `0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>`). This is efficient for direct lookups. | |
| **Outbound Transactions** | `GET /v1/accounts/{address}/transactions` | Lists committed transactions **sent from** the specified account, useful for activity history. | |

## II. Smart Contracts (Modules and Contracts State)

Smart contracts are called **Move Modules** and their data (state) lives in resources and specialized `Table` structures.

| Data Type | Endpoint | Purpose and Retrieved Data | Sources |
| :--- | :--- | :--- | :--- |
| **Contract Code (Modules)** | `GET /v1/accounts/{address}/modules` | Retrieves **all modules** published under an account, including the **compiled bytecode** and the **ABI** (Application Binary Interface). | |
| **Specific Module** | `GET /v1/accounts/{address}/module/{name}` | Fetches the bytecode and ABI for a **single module** by name. | |
| **Read-Only Contract Logic** | `POST /v1/view` | Executes a **read-only Move function** (`view` function) against the current state, returning the decoded JSON results without submitting a transaction or paying gas. | |
| **Table Item (Typed)** | `POST /v1/tables/{handle}/item` | Reads a **specific, typed entry** from a Move `Table` data structure, requiring the table handle, key type, value type, and the key. | |
| **Table Item (Raw BCS)** | `POST /v1/tables/{handle}/raw_item` | Reads a specific entry, requiring a serialized key and returning the **raw BCS value** for efficiency. | |

## III. Transactions and Ledger Data

The API handles the entire transaction lifecycle and general chain metadata.

| Data Type | Endpoint | Purpose and Retrieved Data | Sources |
| :--- | :--- | :--- | :--- |
| **Transaction Simulation** | `POST /v1/transactions/simulate` | Executes a **dry-run** of a transaction, returning the VM status, **gas usage estimation**, and emitted events without committing to the blockchain. This is considered a fundamental best practice. | |
| **Gas Price** | `GET /v1/estimate_gas_price` | Returns the current **estimated gas price**. | |
| **Committed Transactions** | `GET /v1/transactions` | Retrieves a **paginated global feed** of committed transactions. | |
| **Transaction Lookup** | `GET /v1/transactions/by_hash/{hash}` or `/by_version/{version}` | Fetches a specific transaction by its unique hash or by its sequential **ledger version**. | |
| **Events (by stream/handle)** | `GET /v1/accounts/{address}/events/{creation_number}` or `/events/{event_handle}/{field_name}` | Retrieves informational messages (logs) emitted by smart contracts, indexed either by their creation stream number or by a specific event handle field. | |
| **Blocks** | `GET /v1/blocks/by_height/{height}` or `/by_version/{version}` | Retrieves block metadata and optionally includes all transactions within that block using `?with_transactions=true`. | |
| **Ledger Info** | `GET /v1/` (Root) | Retrieves general network metadata, including **chain ID**, current **ledger version**, and **block height**. | |

## IV. Historical Data and Limitations

*   **Historical State Queries**: Most read endpoints accept the query parameter `?ledger_version=` to retrieve the state as it existed immediately after that transaction version.
*   **Pruning Limitation**: Fullnodes may **prune** old transactions and state versions to save storage space. Querying pruned data results in a **410 Gone** error.

*   **Indexer Necessity**: For tasks involving **complex queries, filtering, aggregation, or iteration** (like scanning all keys in a Move Table or retrieving a user's full, deep historical NFT list), the sources strongly recommend using the **Aptos Indexer GraphQL API** instead of the Fullnode REST API. The Fullnode API is designed for immediate, specific lookups, not broad data analytics.
