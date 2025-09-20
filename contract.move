module counter_addr::Counter {
    use std::signer;

    struct Counter has key {
        value: u64,
    }

    public entry fun init(account: &signer) {
        move_to(account, Counter { value: 0 });
    }

    public entry fun increment(account: &signer) acquires Counter {
        let counter = borrow_global_mut<Counter>(signer::address_of(account));
        counter.value = counter.value + 1;
    }

    public fun get(address: address): u64 acquires Counter {
        borrow_global<Counter>(address).value
    }
}
