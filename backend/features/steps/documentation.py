from behave import step
from urllib.request import urlopen

@step(u'I do not do much')
def step_impl(context):
    print("Nothing much happening here")


@step(u'I do a lot')
def step_impl(context):
    print("Too much happening here")


@step(u'I read the readme')
def step_impl(context):
    url = "https://raw.githubusercontent.com/behave/behave/master/README.rst"
    readme = urlopen(url)
    msg = "".join(next(readme).decode("utf-8") for _x in range(10))
    print(msg)
