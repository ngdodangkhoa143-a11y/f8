/*
 * This file is part of the CitizenFX project - http://citizen.re/
 *
 * See LICENSE and MENTIONS in the root of the source tree for information
 * regarding licensing.
 */

#include "StdInc.h"
#include "Hooking.h"

#include <Error.h>

extern HANDLE g_rosClearedEvent;

static InitFunction initfunction([]()
{
	HMODULE rosDll = LoadLibrary(L"ros.dll");
	if (rosDll != nullptr)
	{
		auto runEarlier = ((void (*)(const wchar_t*))GetProcAddress(rosDll, "runEarlier"));
		
		if (runEarlier)
		{
			runEarlier(MakeRelativeCitPath(L"").c_str());
		}
	}
});

static HookFunction hookFunction([] ()
{
	g_rosClearedEvent = CreateEvent(nullptr, TRUE, FALSE, nullptr);

	HMODULE rosDll = LoadLibrary(L"ros.dll");
	if (rosDll != nullptr)
	{
		((void (*)(const wchar_t*))GetProcAddress(rosDll, "runEarly"))(MakeRelativeCitPath(L"").c_str());
	}

	// F8 Standalone: Signal the event BEFORE run() so GetScSdkStub() doesn't block.
	// run() still needs to execute to set up the socialclub.dll session data,
	// but we run it in a detached thread so it doesn't hold up the init chain.
	SetEvent(g_rosClearedEvent);

	try
	{
		// Bypass DLC checks (CExtraContentManager::IsDLCPresent)
		// Fixes bakerloo-monkey-five when drawing DLC weapons in build 3258
		static struct
		{
			static bool HasEntitlement(void* manager, uint32_t hash)
			{
				return true;
			}
		} bypass;

		hook::jump(hook::get_pattern("48 83 EC 20 48 8B 01 48 8D 54 24 30"), bypass.HasEntitlement);
	}
	catch (...)
	{
		// Pattern not found, ignore
	}

	std::thread([=]()
	{
		if (rosDll != nullptr)
		{
			((void(*)(const wchar_t*))GetProcAddress(rosDll, "run"))(MakeRelativeCitPath(L"").c_str());
		}
	}).detach();
});
