lookup = ["FizzBuzz", "", "", "Fizz", "", "Buzz",
          "Fizz", "", "", "Fizz", "Buzz", "", "Fizz", "", ""]


def fizzbuzz(n: int):
    return (lookup[n%15] if lookup[n%15] != "" else str(n)) + (str(fizzbuzz(n-1)) if n > 1 else "")
