<script>
	let email_error_shown = false;
    let password_error_shown = false;
    let wrong_password_error_shown = false;

    async function submit_handler(event) {
        email_error_shown = false;
        password_error_shown = false;
        wrong_password_error_shown = false;

        let email = document.querySelector("input.email");
        let password = document.querySelector("input.password");

        if(!email || !password) { return; }

        // check validation
        if(!event.target.checkValidity()) {
            if(!email.checkValidity()) {
                email_error_shown = true;
            } else if(!password.checkValidity()){
                password_error_shown = true;
            }
        } else {
          // check email and password
          
          let form_data = new FormData();
          form_data.append("email", email.value);
          form_data.append("password", password.value);

          let url = "https://test-api.clonedesk.com/api/v2/current-user/login-session"
          fetch(url, {
              method: 'POST',
              body: form_data,
              credentials: "include"
          }).then(async (response) => {
              let result = await response.json();
              console.log(response);
              if(!result.success) {
                  wrong_password_error_shown = true;
              } else {
                window.location.replace("/dashboard");
              }
          }).catch(_err => {
              wrong_password_error_shown = true;
          });
        }
    }
</script>

<style>
h3 {
    text-align: center;
    font-size: 28px;
    font-weight: 400;
    margin: 40px 0 20px 0;
    color: #32c5d2;
}
form {
    width: 100%;
}
input[type=email], input[type=password] {
    background-color: #dde3ec;
    color: #8290a3;
    border: 1px solid #dde3ec;
    padding: 6px 12px;
    width: 100%;
    border-radius: 4px;
    transition: border-color ease-in-out .15s,box-shadow ease-in-out .15s;
    font-size: 14px;
    padding: 6px 12px;
    outline: 0;
    height: 43px;
    box-sizing:border-box;
}
.field-wrapper {
    margin-bottom: 15px;
}

.field-wrapper span.error {
    color: #e73d4a;
    margin-top: 5px;
    margin-bottom: 5px;
    display: block;
    font-size: 14px;
}
input[type=email]:active, input[type=password]:active {
    border: 1px solid #c3ccda;
    transition: border-color ease-in-out .15s,box-shadow ease-in-out .15s;
}
.form-actions {
    border-bottom: 1px solid #eee;
    padding: 25px 30px;
    margin-left: -30px;
    margin-right: -30px;
    display: flex;
    align-items: center;
}
.form-actions button {
    margin-top: 1px;
    font-weight: 600;
    padding: 10px 20px!important;
    font-size: 12px;
    transition: box-shadow .28s cubic-bezier(.4,0,.2,1);
    border-radius: 2px;
    overflow: hidden;
    position: relative;
    user-select: none;
    box-shadow: 0 1px 3px rgba(0,0,0,.1), 0 1px 2px rgba(0,0,0,.18);
    color: #FFF;
    background-color: #32c5d2;
    border-color: #32c5d2;
    display: inline-block;
    text-align: center;
    vertical-align: middle;
    touch-action: manipulation;
    cursor: pointer;
    border: 1px solid transparent;
    white-space: nowrap;
    text-transform: uppercase;
    outline: 0;
}
.form-actions button:active {
    box-shadow: 0 8px 18px rgba(0,0,0,.22), 0 6px 6px rgba(0,0,0,.26);
}
.form-actions button:hover {
    box-shadow: 0 3px 6px rgba(0,0,0,.2), 0 3px 6px rgba(0,0,0,.26);
}

.form-actions .rememberme {
    margin-left: 8px;
    display: inline-block;
    position: relative;
    padding-left: 30px;
    cursor: pointer;
    font-size: 14px;
    transition: all .3s;
    flex-grow: 2;
    color: #8290a3;
}
.form-actions .rememberme input {
    position: absolute;
    z-index: -1;
    opacity: 0;
}
.form-actions .rememberme span {
    border: 1px solid #d9d9d9;
    background: 0 0;
    position: absolute;
    top: 1px;
    left: 0;
    height: 18px;
    width: 18px;
    box-sizing: border-box;
    color: #8290a3;
    cursor: pointer;
}
.form-actions .rememberme span::after {
    content: '';
    position: absolute;
    display: none;
    left: 5px;
    top: 0px;
    width: 5px;
    height: 10px;
    border: solid #888;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
}
.form-actions .rememberme input:checked~span:after {
    display: block;
}
.form-actions .forget-password {
    font-size: 14px;
    display: inline-block;
    text-shadow: none;
    color: #337ab7;
    text-decoration: none;
}

</style>

<form on:submit|preventDefault={submit_handler} name="loginForm" class="login-form" action="/login" method="post" autocomplete="off" novalidate="novalidate">
		<h3 class="">Sign In</h3>
        <div class="field-wrapper">
            <input class="email" type="email" placeholder="E-mail" name="loginForm[email]" required="required" value="" tabindex="1" aria-required="true" aria-invalid="true" aria-describedby="loginForm\[email\]-error">
            {#if email_error_shown}
                <span class="error">Field should be in proper format</span>
            {/if}
        </div>
                        	                
        <div class="field-wrapper">
            <input class="password" type="password" autocomplete="off" placeholder="Password" name="loginForm[password]" required="required" value="" tabindex="2" aria-required="true" aria-invalid="false" aria-describedby="loginForm\[password\]-error">
            {#if password_error_shown}
                <span class="error">Password is required</span>
            {/if}
            {#if wrong_password_error_shown}
                <span class="error">Wrong email or password</span>
            {/if}
        </div>

		<div class="form-actions">
			<button type="submit" class="btn green uppercase" tabindex="4">Login</button>
			<label class="rememberme ">
				<input type="checkbox" name="loginForm[remember]" value="1">Remember<span tabindex="3"></span>
			</label>
			<a href="/" id="forget-password" class="forget-password">Forgot Password?</a>
		</div>
	</form>
